import httpx
import os
from typing import List, Dict, AsyncGenerator, Optional
import json


class OllamaClient:
    """Client for Ollama local LLM"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip('/')  # Remove trailing slash if present
        self.available = False
        self._available_models = []
    
    async def check_availability(self) -> bool:
        """Check if Ollama is running and accessible"""
        try:
            # Increased timeout for remote connections (was 2.0, now 10.0)
            async with httpx.AsyncClient(timeout=10.0) as client:
                print(f"[OLLAMA] Checking availability at {self.base_url}/api/tags")
                response = await client.get(f"{self.base_url}/api/tags")
                self.available = response.status_code == 200
                
                if self.available:
                    data = response.json()
                    self._available_models = [model['name'] for model in data.get('models', [])]
                    print(f"[OLLAMA] Available at {self.base_url} with {len(self._available_models)} models")
                else:
                    print(f"[OLLAMA] Server responded with status {response.status_code}")
                
                return self.available
        except httpx.ConnectTimeout:
            print(f"[OLLAMA] Connection timeout to {self.base_url}")
            self.available = False
            return False
        except httpx.ConnectError as e:
            print(f"[OLLAMA] Connection error to {self.base_url}: {e}")
            self.available = False
            return False
        except Exception as e:
            print(f"[OLLAMA] Not available at {self.base_url}: {e}")
            self.available = False
            return False
    
    def get_available_models(self) -> List[str]:
        """Get list of available Ollama models"""
        return self._available_models
    
    async def list_models(self) -> List[str]:
        """List available Ollama models (async version for API endpoint)"""
        await self.check_availability()
        return self._available_models
    
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3",
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from Ollama
        Yields text chunks as they arrive
        """
        # Strip ollama: prefix if present
        if model.startswith('ollama:'):
            model = model[7:]  # Remove "ollama:" prefix
        
        # Always re-check availability to ensure we have a valid connection
        if not self.available:
            await self.check_availability()
            if not self.available:
                raise Exception(f"Ollama is not available at {self.base_url}. Make sure Ollama is running and accessible.")
        
        # Default system prompt from env or hardcoded fallback
        # Check for None OR empty string
        if not system_prompt:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
            print(f"[OLLAMA] Using default system prompt")
        else:
            print(f"[OLLAMA] Using custom system prompt ({len(system_prompt)} chars)")
        
        # Format messages for Ollama
        ollama_messages = []
        
        # Add system message if provided
        if system_prompt:
            ollama_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add conversation messages
        for msg in messages:
            ollama_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Stream request
        try:
            print(f"[OLLAMA] Streaming from {self.base_url}/api/chat with model {model}")
            
            # Use longer timeout for generation (5 min for slow models)
            async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0)) as client:
                async with client.stream(
                    'POST',
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": ollama_messages,
                        "stream": True
                    }
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise Exception(f"Ollama returned status {response.status_code}: {error_text.decode()}")
                    
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                
                                # Check for errors in response
                                if 'error' in data:
                                    raise Exception(f"Ollama error: {data['error']}")
                                
                                # Check if stream is done
                                if data.get('done', False):
                                    break
                                
                                if 'message' in data:
                                    content = data['message'].get('content', '')
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                                
        except httpx.ConnectTimeout:
            raise Exception(f"Connection timeout to Ollama at {self.base_url}. Check if the server is accessible.")
        except httpx.ConnectError as e:
            raise Exception(f"Cannot connect to Ollama at {self.base_url}: {e}")
        except httpx.ReadTimeout:
            raise Exception(f"Read timeout from Ollama. The model may be taking too long to respond.")
        except Exception as e:
            if "Ollama" in str(e):
                raise  # Re-raise our own exceptions
            raise Exception(f"Ollama streaming error: {str(e)}")
    
    async def get_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3",
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Get full completion from Ollama (non-streaming)
        """
        full_response = ""
        async for chunk in self.stream_completion(messages, model, system_prompt):
            full_response += chunk
        return full_response
