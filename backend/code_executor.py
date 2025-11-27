import docker
import asyncio
import time
import os
from datetime import datetime
from typing import Dict, Tuple, Optional, List
from dotenv import load_dotenv

load_dotenv()


class CodeExecutor:
    def __init__(self, cpu_cores: int = None, memory_limit: str = None, storage_limit: str = None, timeout: int = None):
        self.client = docker.from_env()
        
        # Use provided values or fall back to env vars or defaults
        cpu_cores = cpu_cores if cpu_cores is not None else int(os.getenv("DOCKER_CPU_CORES", "2"))
        self.cpu_quota = int(cpu_cores * 100000)  # CPU quota in microseconds (1 core = 100000)
        self.memory_limit = memory_limit or os.getenv("DOCKER_MEMORY_LIMIT", "8g")
        self.storage_limit = storage_limit or os.getenv("DOCKER_STORAGE_LIMIT", "10g")
        self.timeout = timeout if timeout is not None else int(os.getenv("DOCKER_EXECUTION_TIMEOUT", "30"))
        self.image_name = "ai-code-executor:latest"
        self.containers: Dict[int, docker.models.containers.Container] = {}
        
    def build_image(self):
        """Build the Docker image for code execution"""
        print("Building Docker image...")
        self.client.images.build(
            path=".",
            tag=self.image_name,
            rm=True,
            dockerfile="Dockerfile"
        )
        print(f"Docker image '{self.image_name}' built successfully!")
    
    def get_or_create_container(self, conversation_id: int) -> docker.models.containers.Container:
        """Get existing container or create new one for conversation"""
        if conversation_id in self.containers:
            container = self.containers[conversation_id]
            # Check if container is still running
            try:
                container.reload()
                if container.status == "running":
                    return container
            except docker.errors.NotFound:
                pass
        
        # Create new container
        container = self.client.containers.create(
            self.image_name,
            command="/bin/bash",
            detach=True,
            stdin_open=True,
            tty=True,
            cpu_quota=self.cpu_quota,
            mem_limit=self.memory_limit,
            network_disabled=False,  # Internet enabled
            environment={
                "CONVERSATION_ID": str(conversation_id)
            },
            # Removed storage_opt as it's not universally supported
            working_dir="/workspace"
        )
        container.start()
        self.containers[conversation_id] = container
        return container
    
    async def execute_code(
        self, 
        conversation_id: int, 
        language: str, 
        code: str,
        feedback_callback=None
    ) -> Tuple[str, int, float, List[Dict[str, str]], Optional[Dict]]:
        """
        Execute code in Docker container with feedback
        Returns: (output, exit_code, duration, files, peak_stats)
        """
        async def send_feedback(message: str, msg_type: str = "info"):
            """Send feedback message if callback is provided"""
            if feedback_callback:
                # Use different event type for code_preview
                if msg_type == "code_preview":
                    await feedback_callback({"type": "code_preview", "content": message})
                else:
                    await feedback_callback({"type": "feedback", "message": message, "level": msg_type})
        
        # Check if container exists
        container_exists = conversation_id in self.containers
        
        if not container_exists:
            await send_feedback("🐳 Creating Docker container...", "info")
        
        start_time = time.time()
        container = self.get_or_create_container(conversation_id)
        
        if not container_exists:
            container_creation_time = time.time() - start_time
            await send_feedback(f"✓ Container started ({container.short_id}) in {container_creation_time:.1f}s", "success")
        
        # Prepare execution command based on language
        # Generate unique filename with timestamp to avoid overwrites
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]  # YYYYmmdd_HHMMSS_mmm
        
        if language.lower() in ["python", "py"]:
            filename = f"script_{timestamp}.py"
            base_command = ["python", filename]
        elif language.lower() in ["javascript", "js", "node"]:
            filename = f"script_{timestamp}.js"
            base_command = ["node", filename]
        elif language.lower() in ["bash", "sh", "shell"]:
            filename = f"script_{timestamp}.sh"
            base_command = ["bash", filename]
        else:
            await send_feedback(f"❌ Unsupported language: {language}", "error")
            return f"Unsupported language: {language}", 1, 0.0, [], None
        
        # Wrap command with timeout if set (timeout command returns 124 on timeout)
        if self.timeout > 0:
            command = ["timeout", "--signal=KILL", str(self.timeout)] + base_command
        else:
            command = base_command
        
        await send_feedback(f"📝 Writing {language} code to container...", "info")
        
        # Send code preview (first 200 chars)
        code_preview = code[:200] + ('...' if len(code) > 200 else '')
        await send_feedback(f"```{language}\n{code_preview}\n```", "code_preview")
        
        # List files before execution
        before_exec = container.exec_run(["ls", "-1", "/workspace"], workdir="/workspace")
        files_before = set(before_exec.output.decode('utf-8').strip().split('\n')) if before_exec.output else set()
        
        # Write code to file in container
        try:
            # Use bash heredoc to write file reliably
            write_cmd = f"cat > {filename} << 'EOFCODE'\n{code}\nEOFCODE"
            
            exec_result = container.exec_run(
                ["bash", "-c", write_cmd],
                workdir="/workspace"
            )
            
            if exec_result.exit_code != 0:
                await send_feedback(f"❌ Failed to write code file", "error")
                return f"Failed to write code file: {exec_result.output.decode('utf-8')}", 1, 0.0, [], None
            
            await send_feedback(f"⚡ Executing {language} code...", "info")
            
            # Send execution_start event
            if feedback_callback:
                await feedback_callback({"type": "execution_start", "language": language})
            
            # Track peak stats during execution
            peak_cpu = 0.0
            peak_memory = 0
            
            # Execute the code with timeout
            exec_start_time = time.time()
            
            # Start stats monitoring in background
            async def monitor_stats():
                nonlocal peak_cpu, peak_memory
                while True:
                    try:
                        stats = self.get_container_stats(conversation_id)
                        if stats:
                            peak_cpu = max(peak_cpu, stats['cpu_percent'])
                            peak_memory = max(peak_memory, stats['memory_used'])
                        await asyncio.sleep(0.5)  # Monitor every 500ms
                    except:
                        break
            
            # Start monitoring task
            monitor_task = asyncio.create_task(monitor_stats())
            
            # Run in a thread (timeout is handled by the timeout command in container)
            loop = asyncio.get_event_loop()
            
            # Add a generous Python-side timeout as backup (2x container timeout + 30s buffer)
            python_timeout = (self.timeout * 2 + 30) if self.timeout > 0 else None
            
            try:
                if python_timeout:
                    exec_result = await asyncio.wait_for(
                        loop.run_in_executor(
                            None,
                            lambda: container.exec_run(
                                command,
                                workdir="/workspace",
                                demux=True
                            )
                        ),
                        timeout=python_timeout
                    )
                else:
                    exec_result = await loop.run_in_executor(
                        None,
                        lambda: container.exec_run(
                            command,
                            workdir="/workspace",
                            demux=True
                        )
                    )
                
                duration = time.time() - exec_start_time
                
            except asyncio.TimeoutError:
                # This should rarely happen - backup timeout
                duration = time.time() - exec_start_time
                
                # Kill the running process in the container
                try:
                    container.exec_run("pkill -9 -f python", demux=True)
                    container.exec_run("pkill -9 -f bash", demux=True)
                    container.exec_run("pkill -9 -f node", demux=True)
                except:
                    pass
                
                # Stop monitoring
                monitor_task.cancel()
                try:
                    await monitor_task
                except asyncio.CancelledError:
                    pass
                
                await send_feedback(f"⏱️ Execution timeout - process killed. You can change the timeout in Settings → Features.", "error")
                return f"Execution timeout - process killed. You can change the timeout in Settings → Features.", 124, duration, [], {'peak_cpu': peak_cpu, 'peak_memory': peak_memory, 'container_id': container.id}
            
            # Stop monitoring
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
            
            # Get output
            stdout, stderr = exec_result.output
            exit_code = exec_result.exit_code
            
            # Check if killed by timeout command (exit code 137 = 128 + SIGKILL)
            if exit_code == 137 or exit_code == 124:
                await send_feedback(f"⏱️ Execution timeout ({self.timeout}s exceeded) - process killed. You can change the timeout in Settings → Features.", "error")
                output_parts = []
                if stdout:
                    output_parts.append(stdout.decode('utf-8', errors='replace'))
                if stderr:
                    output_parts.append(stderr.decode('utf-8', errors='replace'))
                output = "\n".join(output_parts).strip()
                return f"{output}\n\nExecution timeout ({self.timeout}s exceeded). You can change the timeout in Settings → Features.", 124, duration, [], {'peak_cpu': peak_cpu, 'peak_memory': peak_memory, 'container_id': container.id}
            
            if exit_code == 0:
                await send_feedback(f"✓ Code executed successfully in {duration:.2f}s", "success")
            else:
                await send_feedback(f"❌ Execution failed with exit code {exit_code}", "error")
            
            # Send execution_end event
            if feedback_callback:
                await feedback_callback({"type": "execution_end", "exit_code": exit_code, "duration": duration})
            
            # Combine stdout and stderr
            output_parts = []
            if stdout:
                output_parts.append(stdout.decode('utf-8', errors='replace'))
            if stderr:
                output_parts.append(stderr.decode('utf-8', errors='replace'))
            
            output = "\n".join(output_parts).strip()
            
            await send_feedback(f"📁 Checking for created files...", "info")
            
            # List files after execution
            after_exec = container.exec_run(["ls", "-1", "/workspace"], workdir="/workspace")
            files_after = set(after_exec.output.decode('utf-8').strip().split('\n')) if after_exec.output else set()
            
            # Find new files (exclude the script file itself)
            new_files = files_after - files_before - {filename}
            
            # Read content of new files
            files_list = []
            for file in new_files:
                if file:  # Skip empty strings
                    try:
                        content_result = container.exec_run(["cat", file], workdir="/workspace")
                        if content_result.exit_code == 0:
                            files_list.append({
                                "filename": file,
                                "content": content_result.output.decode('utf-8', errors='replace')
                            })
                    except:
                        pass  # Skip files that can't be read
            
            if len(files_list) > 0:
                await send_feedback(f"✓ Found {len(files_list)} new file(s)", "success")
            
            peak_stats = {
                'peak_cpu': peak_cpu,
                'peak_memory': peak_memory,
                'container_id': container.id
            }
            
            return output, exit_code, duration, files_list, peak_stats
            
        except Exception as e:
            await send_feedback(f"❌ Execution error: {str(e)}", "error")
            return f"Execution error: {str(e)}", 1, 0.0, [], None
    
    def get_container_stats(self, conversation_id: int) -> Optional[Dict]:
        """Get real-time stats for a container"""
        if conversation_id not in self.containers:
            return None
        
        try:
            container = self.containers[conversation_id]
            container.reload()
            
            if container.status != "running":
                return None
            
            # Get stats (streaming=False for single snapshot)
            stats = container.stats(stream=False)
            
            # Calculate CPU percentage
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            
            cpu_percent = 0.0
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * 100.0
            
            # Memory stats
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 0)
            memory_percent = (memory_usage / memory_limit * 100) if memory_limit > 0 else 0
            
            # Network stats
            networks = stats.get('networks', {})
            rx_bytes = sum(net.get('rx_bytes', 0) for net in networks.values())
            tx_bytes = sum(net.get('tx_bytes', 0) for net in networks.values())
            
            return {
                'container_id': container.id,
                'cpu_percent': round(cpu_percent, 2),
                'memory_used': memory_usage,
                'memory_usage': memory_usage,  # Keep for backwards compat
                'memory_limit': memory_limit,
                'memory_percent': round(memory_percent, 2),
                'rx_bytes': rx_bytes,
                'tx_bytes': tx_bytes,
                'status': container.status
            }
            
        except Exception as e:
            print(f"Error getting container stats: {e}")
            return None
    
    def cleanup_container(self, conversation_id: int):
        """Stop and remove container for a conversation"""
        if conversation_id in self.containers:
            try:
                container = self.containers[conversation_id]
                container.stop(timeout=5)
                container.remove()
                del self.containers[conversation_id]
            except Exception as e:
                print(f"Error cleaning up container: {e}")
    
    def cleanup_all_containers(self):
        """Stop and remove all containers"""
        for conv_id in list(self.containers.keys()):
            self.cleanup_container(conv_id)


# Global executor instance
executor = CodeExecutor()
