# Fix for macOS multiprocessing with uvicorn --reload
# Must be at the very top before any other imports
import sys
import platform
if platform.system() == "Darwin":
    import multiprocessing
    try:
        multiprocessing.set_start_method('spawn', force=False)
    except RuntimeError:
        pass  # Already set

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, UploadFile
from fastapi import File as FastAPIFile
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import re
import json
import asyncio
import docker

from backend.database import init_db, get_session, Conversation, Message, CodeExecution, File, Settings, ExecutionLog
from backend.anthropic_client import claude_client
from backend.ollama_client import OllamaClient
from backend.code_executor import executor, CodeExecutor

# Whisper client - check if remote GPU server is configured
import os

async def get_whisper_client(db: AsyncSession):
    """Get appropriate whisper client based on settings"""
    # Check database first
    result = await db.execute(select(Settings).where(Settings.key == "whisper_server_url"))
    setting = result.scalar_one_or_none()
    
    whisper_url = None
    if setting and setting.value:
        whisper_url = setting.value
    else:
        # Fall back to environment variable
        whisper_url = os.getenv("WHISPER_SERVER_URL")
    
    if whisper_url:
        # Use remote GPU server
        from backend.whisper_remote_client import WhisperRemoteClient
        return WhisperRemoteClient(server_url=whisper_url)
    else:
        # Use local CPU
        from backend.whisper_client import whisper_client
        return whisper_client

# Initialize Ollama client
ollama_client = OllamaClient()

app = FastAPI(title="Claude Code Executor")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SendMessageRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    model: str = "claude-sonnet-4-20250514"
    provider: str = "anthropic"


class NewConversationRequest(BaseModel):
    title: str = "New Conversation"
    model: str = "claude-sonnet-4-20250514"
    provider: str = "anthropic"


class InsertOutputRequest(BaseModel):
    conversation_id: int
    execution_id: int


# Startup event
@app.on_event("startup")
async def startup_event():
    await init_db()
    
    # Check Ollama availability
    await ollama_client.check_availability()
    if ollama_client.available:
        models = ollama_client.get_available_models()
        print(f"✓ Ollama detected with {len(models)} model(s): {', '.join(models[:3])}")
    else:
        print("⚠ Ollama not detected (optional - Claude API will be used)")
    
    # Build Docker image if not exists
    try:
        executor.client.images.get(executor.image_name)
        print(f"Docker image '{executor.image_name}' found.")
    except:
        print("Docker image not found. Building...")
        executor.build_image()


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    executor.cleanup_all_containers()


def extract_code_blocks(text: str) -> List[tuple]:
    """
    Extract code blocks from markdown text
    Returns list of (language, code) tuples
    """
    # Pattern with language identifier: ```python\ncode```
    pattern_with_lang = r"```(\w+)\n(.*?)```"
    # Pattern without language identifier: ```\ncode```
    pattern_without_lang = r"```\n(.*?)```"
    
    matches = []
    
    # First find blocks with language
    matches_with_lang = re.findall(pattern_with_lang, text, re.DOTALL)
    matches.extend(matches_with_lang)
    
    # Then find blocks without language (default to python)
    # But exclude ones we already matched (they have language prefix)
    text_remaining = re.sub(pattern_with_lang, '', text, flags=re.DOTALL)
    matches_without_lang = re.findall(pattern_without_lang, text_remaining, re.DOTALL)
    for code in matches_without_lang:
        # Try to detect language from code content
        code_stripped = code.strip()
        if code_stripped.startswith('import ') or code_stripped.startswith('from ') or 'def ' in code_stripped or 'print(' in code_stripped:
            matches.append(('python', code))
        elif code_stripped.startswith('#!/bin/bash') or code_stripped.startswith('#!/bin/sh') or code_stripped.startswith('apt') or code_stripped.startswith('pip '):
            matches.append(('bash', code))
        elif code_stripped.startswith('const ') or code_stripped.startswith('let ') or code_stripped.startswith('var ') or 'console.log' in code_stripped:
            matches.append(('javascript', code))
        else:
            # Default to python
            matches.append(('python', code))
    
    return matches


async def execute_code_blocks(
    conversation_id: int,
    message_id: int,
    code_blocks: List[tuple],
    db: AsyncSession,
    feedback_queue: asyncio.Queue = None
):
    """Execute all code blocks and save results to database"""
    async def send_feedback(feedback_data):
        if feedback_queue:
            await feedback_queue.put(feedback_data)
        # Save feedback to database for persistence
        if feedback_data.get('type') == 'feedback':
            log_entry = ExecutionLog(
                conversation_id=conversation_id,
                message_id=message_id,
                message=feedback_data.get('message', ''),
                level=feedback_data.get('level', 'info')
            )
            db.add(log_entry)
            # Use flush to persist but keep in same transaction
            await db.flush()
    
    container_id_saved = False
    for language, code in code_blocks:
        if language.lower() in ["python", "py", "javascript", "js", "node", "bash", "sh", "shell"]:
            # Execute code with feedback
            output, exit_code, duration, files, peak_stats = await executor.execute_code(
                conversation_id, language, code, feedback_callback=send_feedback
            )
            
            # Save container_id to conversation (only once)
            if not container_id_saved and peak_stats and peak_stats.get('container_id'):
                result = await db.execute(
                    select(Conversation).where(Conversation.id == conversation_id)
                )
                conversation = result.scalar_one_or_none()
                if conversation:
                    conversation.container_id = peak_stats['container_id']
                    container_id_saved = True
            
            # Save execution to database
            execution = CodeExecution(
                message_id=message_id,
                language=language,
                code=code,
                output=output,
                exit_code=exit_code,
                duration=duration,
                peak_cpu=peak_stats['peak_cpu'] if peak_stats else None,
                peak_memory=peak_stats['peak_memory'] if peak_stats else None
            )
            db.add(execution)
            await db.flush()  # Get execution.id
            
            # Save files
            for file_data in files:
                file_obj = File(
                    execution_id=execution.id,
                    filename=file_data["filename"],
                    content=file_data["content"]
                )
                db.add(file_obj)
    
    await db.commit()


@app.get("/api/providers")
async def get_providers():
    """Get available LLM providers"""
    providers = [
        {
            "id": "anthropic",
            "name": "Anthropic (Claude)",
            "available": True,
            "models": [
                {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
                {"id": "claude-opus-4-20250514", "name": "Claude Opus 4"},
                {"id": "claude-sonnet-3-5-20241022", "name": "Claude Sonnet 3.5"},
                {"id": "claude-haiku-3-5-20241022", "name": "Claude Haiku 3.5"}
            ]
        },
        {
            "id": "openai",
            "name": "OpenAI (GPT)",
            "available": True,
            "models": [
                {"id": "gpt-5.1", "name": "GPT-5.1"},
                {"id": "gpt-5", "name": "GPT-5"},
                {"id": "gpt-5-mini", "name": "GPT-5 Mini"},
                {"id": "gpt-4.1", "name": "GPT-4.1"},
                {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini"},
                {"id": "gpt-4o", "name": "GPT-4o"},
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini"}
            ]
        },
        {
            "id": "gemini",
            "name": "Google (Gemini)",
            "available": True,
            "models": [
                {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro"},
                {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
                {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash-Lite"},
                {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"}
            ]
        }
    ]
    
    # Add Ollama if available
    if ollama_client.available:
        ollama_models = ollama_client.get_available_models()
        providers.append({
            "id": "ollama",
            "name": "Ollama (Local)",
            "available": True,
            "models": [
                {"id": model, "name": model}
                for model in ollama_models
            ]
        })
    
    return providers


@app.get("/api/models")
async def get_models():
    """Get available Claude models"""
    return claude_client.get_available_models()


@app.get("/api/models/ollama")
async def get_ollama_models(db: AsyncSession = Depends(get_session)):
    """Get available Ollama models"""
    try:
        ollama_client = OllamaClient()
        
        # Get Ollama host from settings
        result = await db.execute(
            select(Settings).where(Settings.key == "ollama_host")
        )
        setting = result.scalar_one_or_none()
        ollama_host = setting.value if setting else "http://localhost:11434"
        
        # Override client host if different
        if ollama_host != ollama_client.base_url:
            ollama_client = OllamaClient(base_url=ollama_host)
        
        models = await ollama_client.list_models()
        return {"models": models}
    except Exception as e:
        return {"models": [], "error": str(e)}


@app.post("/api/conversations")
async def create_conversation(
    request: NewConversationRequest,
    db: AsyncSession = Depends(get_session)
):
    """Create a new conversation"""
    conversation = Conversation(
        title=request.title,
        model=request.model
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "model": conversation.model,
        "created_at": conversation.created_at.isoformat()
    }


@app.get("/api/conversations")
async def get_conversations(db: AsyncSession = Depends(get_session)):
    """Get all conversations"""
    result = await db.execute(
        select(Conversation).order_by(desc(Conversation.created_at))
    )
    conversations = result.scalars().all()
    
    return [
        {
            "id": conv.id,
            "title": conv.title,
            "model": conv.model,
            "auto_fix_enabled": bool(conv.auto_fix_enabled),
            "created_at": conv.created_at.isoformat()
        }
        for conv in conversations
    ]


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Get conversation with all messages, executions, and logs"""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp)
    )
    messages = result.scalars().all()
    
    # Format response
    formatted_messages = []
    for msg in messages:
        # Get executions for this message
        result = await db.execute(
            select(CodeExecution)
            .where(CodeExecution.message_id == msg.id)
            .order_by(CodeExecution.timestamp)
        )
        executions = result.scalars().all()
        
        # Get execution logs for this message
        result = await db.execute(
            select(ExecutionLog)
            .where(ExecutionLog.message_id == msg.id)
            .order_by(ExecutionLog.timestamp)
        )
        logs = result.scalars().all()
        
        formatted_executions = []
        for exec in executions:
            # Get files for this execution
            result = await db.execute(
                select(File)
                .where(File.execution_id == exec.id)
                .order_by(File.timestamp)
            )
            files = result.scalars().all()
            
            formatted_executions.append({
                "id": exec.id,
                "language": exec.language,
                "code": exec.code,
                "output": exec.output,
                "exit_code": exec.exit_code,
                "duration": exec.duration,
                "files": [
                    {
                        "id": f.id,
                        "filename": f.filename,
                        "size": len(f.content)
                    }
                    for f in files
                ]
            })
        
        # Format execution logs
        formatted_logs = [
            {
                "id": log.id,
                "message": log.message,
                "level": log.level,
                "timestamp": log.timestamp.isoformat()
            }
            for log in logs
        ]
        
        formatted_messages.append({
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "executions": formatted_executions,
            "execution_logs": formatted_logs
        })
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "model": conversation.model,
        "auto_fix_enabled": bool(conversation.auto_fix_enabled),
        "created_at": conversation.created_at.isoformat(),
        "messages": formatted_messages
    }


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Delete a conversation and cleanup its container"""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Cleanup Docker container
    executor.cleanup_container(conversation_id)
    
    # Delete execution logs for this conversation
    await db.execute(
        delete(ExecutionLog).where(ExecutionLog.conversation_id == conversation_id)
    )
    
    # Delete from database (cascades to messages, executions, files)
    await db.delete(conversation)
    await db.commit()
    
    return {"message": "Conversation deleted"}


@app.patch("/api/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: int,
    request: dict,
    db: AsyncSession = Depends(get_session)
):
    """Update conversation model and auto-fix settings"""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Update model if provided
    if "model" in request:
        conversation.model = request["model"]
    
    # Update auto_fix_enabled if provided
    if "auto_fix_enabled" in request:
        conversation.auto_fix_enabled = 1 if request["auto_fix_enabled"] else 0
    
    await db.commit()
    await db.refresh(conversation)
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "model": conversation.model,
        "auto_fix_enabled": bool(conversation.auto_fix_enabled),
        "created_at": conversation.created_at.isoformat()
    }


@app.patch("/api/conversations/{conversation_id}/rename")
async def rename_conversation(
    conversation_id: int,
    request: dict,
    db: AsyncSession = Depends(get_session)
):
    """Rename a conversation"""
    new_title = request.get("title", "").strip()
    
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    if len(new_title) > 255:
        raise HTTPException(status_code=400, detail="Title too long")
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Update title
    conversation.title = new_title
    await db.commit()
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "model": conversation.model,
        "created_at": conversation.created_at.isoformat()
    }


@app.get("/api/conversations/{conversation_id}/stats")
async def get_container_stats(conversation_id: int):
    """Get current container stats (non-streaming)"""
    stats = executor.get_container_stats(conversation_id)
    
    if stats:
        return stats
    else:
        return {"status": "inactive", "container_id": None}


@app.get("/api/stats/{conversation_id}")
async def stream_stats(conversation_id: int):
    """Stream container stats via SSE"""
    async def generate_stats():
        try:
            while True:
                stats = executor.get_container_stats(conversation_id)
                
                if stats:
                    yield f"data: {json.dumps(stats)}\n\n"
                else:
                    # No container or not running
                    yield f"data: {json.dumps({'status': 'inactive'})}\n\n"
                
                # Update every second
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
    
    return StreamingResponse(generate_stats(), media_type="text/event-stream")


@app.get("/api/execution-history/{conversation_id}")
async def get_execution_history(
    conversation_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Get execution history statistics for a conversation"""
    # Get all executions for this conversation
    result = await db.execute(
        select(CodeExecution)
        .join(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(CodeExecution.timestamp.desc())
        .limit(10)  # Last 10 executions
    )
    executions = result.scalars().all()
    
    if not executions:
        return {
            'total_executions': 0,
            'peak_cpu': 0,
            'peak_memory': 0,
            'total_duration': 0,
            'last_execution': None,
            'recent': []
        }
    
    # Calculate statistics
    total_duration = sum(e.duration for e in executions)
    peak_cpu = max((e.peak_cpu for e in executions if e.peak_cpu), default=0)
    peak_memory = max((e.peak_memory for e in executions if e.peak_memory), default=0)
    last_execution = executions[0].timestamp if executions else None
    
    # Recent executions
    recent = [
        {
            'language': e.language,
            'duration': e.duration,
            'peak_cpu': e.peak_cpu,
            'peak_memory': e.peak_memory,
            'exit_code': e.exit_code,
            'timestamp': e.timestamp.isoformat()
        }
        for e in executions[:5]  # Last 5
    ]
    
    return {
        'total_executions': len(executions),
        'peak_cpu': round(peak_cpu, 2),
        'peak_memory': peak_memory,
        'total_duration': round(total_duration, 2),
        'last_execution': last_execution.isoformat() if last_execution else None,
        'recent': recent
    }


@app.post("/api/send")
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_session)
):
    """Send message and stream response with code execution"""
    
    # Get or create conversation
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == request.conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        # Refresh to get latest auto_fix_enabled value
        await db.refresh(conversation)
        print(f"[SEND] Loaded conversation {conversation.id}, auto_fix_enabled={conversation.auto_fix_enabled}")
    else:
        # Create new conversation
        conversation = Conversation(
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message,
            model=request.model
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    await db.commit()
    
    # Get conversation history
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.timestamp)
    )
    messages = result.scalars().all()
    
    # Format messages for Claude API
    api_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]
    
    # Stream response
    async def generate():
        full_response = ""
        
        # Send conversation ID first
        yield f"data: {json.dumps({'type': 'conversation_id', 'id': conversation.id})}\n\n"
        
        # Get system prompt from settings
        result = await db.execute(select(Settings).where(Settings.key == "system_prompt"))
        system_prompt_setting = result.scalar_one_or_none()
        system_prompt = system_prompt_setting.value if system_prompt_setting else None
        
        # Stream response from appropriate provider
        try:
            # Get appropriate client based on model (also returns mapped model name)
            client, provider_type, mapped_model = await ai_manager.get_client_for_model(conversation.model, db)
            
            # Stream response using mapped model name and system prompt
            async for chunk in client.stream_completion(api_messages, mapped_model, system_prompt=system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
                
        except Exception as e:
            print(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'Streaming error: {str(e)}'})}\n\n"
            return
        
        # Save assistant message
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_response
        )
        db.add(assistant_message)
        await db.commit()
        await db.refresh(assistant_message)
        
        # Extract and execute code blocks
        code_blocks = extract_code_blocks(full_response)
        
        if code_blocks:
            # Create feedback queue
            feedback_queue = asyncio.Queue()
            
            # Start code execution in background
            exec_task = asyncio.create_task(
                execute_code_blocks(
                    conversation.id,
                    assistant_message.id,
                    code_blocks,
                    db,
                    feedback_queue
                )
            )
            
            # Stream feedback messages
            while not exec_task.done():
                try:
                    feedback = await asyncio.wait_for(feedback_queue.get(), timeout=0.1)
                    yield f"data: {json.dumps(feedback)}\n\n"
                except asyncio.TimeoutError:
                    continue
            
            # Wait for execution to complete
            await exec_task
            
            # Drain remaining feedback messages
            while not feedback_queue.empty():
                feedback = await feedback_queue.get()
                yield f"data: {json.dumps(feedback)}\n\n"
            
            # Get executions
            result = await db.execute(
                select(CodeExecution)
                .where(CodeExecution.message_id == assistant_message.id)
                .order_by(CodeExecution.timestamp)
            )
            executions = result.scalars().all()
            
            # Send execution results
            for exec in executions:
                # Get files for this execution
                result = await db.execute(
                    select(File)
                    .where(File.execution_id == exec.id)
                    .order_by(File.timestamp)
                )
                files = result.scalars().all()
                
                yield f"data: {json.dumps({'type': 'execution', 'execution': {'id': exec.id, 'language': exec.language, 'code': exec.code, 'output': exec.output, 'exit_code': exec.exit_code, 'duration': exec.duration, 'files': [{'id': f.id, 'filename': f.filename, 'size': len(f.content)} for f in files]}})}\n\n"
            
            # Auto-fix logic: Check if enabled and if there were errors
            print(f"[AUTO-FIX DEBUG] conversation.auto_fix_enabled = {conversation.auto_fix_enabled}")
            print(f"[AUTO-FIX DEBUG] executions count = {len(executions) if executions else 0}")
            if conversation.auto_fix_enabled and executions:
                # Only consider the LAST execution for auto-fix
                # Skip bash/shell scripts (usually just dependency installation)
                last_exec = executions[-1] if executions else None
                
                # Check if last execution failed and is not bash/shell
                should_autofix = (
                    last_exec and 
                    last_exec.exit_code != 0 and 
                    last_exec.language.lower() not in ['bash', 'shell', 'sh']
                )
                
                print(f"[AUTO-FIX] Last exec: {last_exec.language if last_exec else 'None'}, exit_code: {last_exec.exit_code if last_exec else 'N/A'}")
                print(f"[AUTO-FIX] Should auto-fix: {should_autofix}")
                
                # Auto-fix loop variables
                # Load max attempts from settings or env
                result = await db.execute(select(Settings).where(Settings.key == "auto_fix_max_attempts"))
                max_attempts_setting = result.scalar_one_or_none()
                if max_attempts_setting and max_attempts_setting.value:
                    max_attempts = int(max_attempts_setting.value)
                else:
                    max_attempts = int(os.getenv("AUTO_FIX_MAX_ATTEMPTS", "10"))
                
                attempt = 0
                current_error_exec = last_exec
                
                while should_autofix and attempt < max_attempts:
                    attempt += 1
                    print(f"[AUTO-FIX] Starting attempt {attempt}/{max_attempts} for {current_error_exec.language} code...")
                    yield f"data: {json.dumps({'type': 'auto_fix', 'status': 'analyzing', 'attempt': attempt, 'max_attempts': max_attempts})}\n\n"
                    
                    # Load auto-fix prompt template from settings
                    result = await db.execute(select(Settings).where(Settings.key == "auto_fix_prompt"))
                    auto_fix_setting = result.scalar_one_or_none()
                    
                    if auto_fix_setting and auto_fix_setting.value:
                        prompt_template = auto_fix_setting.value
                    else:
                        prompt_template = os.getenv("AUTO_FIX_PROMPT",
                            "The code execution failed with the following error(s):\n\n"
                            "{errors}\n\n"
                            "Please provide ONLY the fixed code in code blocks. Do not include any explanations, commentary, or text outside of code blocks. Just the working code."
                        )
                    
                    # Create error details from current failing execution
                    error_details = f"Language: {current_error_exec.language}\nError Output:\n{current_error_exec.output}\nExit Code: {current_error_exec.exit_code}"
                    auto_fix_prompt = prompt_template.replace("{errors}", error_details)
                    
                    # Send prompt to frontend
                    yield f"data: {json.dumps({'type': 'auto_fix_prompt', 'content': auto_fix_prompt, 'attempt': attempt})}\n\n"
                    
                    # Save as user message
                    auto_fix_user_msg = Message(
                        conversation_id=conversation.id,
                        role="user",
                        content=auto_fix_prompt
                    )
                    db.add(auto_fix_user_msg)
                    await db.commit()
                    api_messages.append({"role": "user", "content": auto_fix_prompt})
                    
                    # Stream AI response
                    fix_response = ""
                    yield f"data: {json.dumps({'type': 'auto_fix', 'status': 'fixing', 'attempt': attempt, 'max_attempts': max_attempts})}\n\n"
                    
                    try:
                        client, provider_type, mapped_model = await ai_manager.get_client_for_model(conversation.model, db)
                        result = await db.execute(select(Settings).where(Settings.key == "system_prompt"))
                        system_prompt_setting = result.scalar_one_or_none()
                        system_prompt = system_prompt_setting.value if system_prompt_setting else None
                        
                        async for chunk in client.stream_completion(api_messages, mapped_model, system_prompt=system_prompt):
                            fix_response += chunk
                            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
                    except Exception as e:
                        print(f"Auto-fix streaming error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Auto-fix error: {str(e)}'})}\n\n"
                        yield f"data: {json.dumps({'type': 'auto_fix_complete', 'success': False, 'attempt': attempt, 'reason': str(e)})}\n\n"
                        break
                    
                    # Save assistant response
                    auto_fix_assistant_msg = Message(
                        conversation_id=conversation.id,
                        role="assistant",
                        content=fix_response
                    )
                    db.add(auto_fix_assistant_msg)
                    await db.commit()
                    await db.refresh(auto_fix_assistant_msg)
                    api_messages.append({"role": "assistant", "content": fix_response})
                    
                    # Extract and execute code
                    fix_code_blocks = extract_code_blocks(fix_response)
                    
                    if not fix_code_blocks:
                        yield f"data: {json.dumps({'type': 'auto_fix_complete', 'success': False, 'attempt': attempt, 'reason': 'No code blocks in response'})}\n\n"
                        break
                    
                    # Execute the fix code
                    feedback_queue = asyncio.Queue()
                    exec_task = asyncio.create_task(
                        execute_code_blocks(
                            conversation.id,
                            auto_fix_assistant_msg.id,
                            fix_code_blocks,
                            db,
                            feedback_queue
                        )
                    )
                    
                    while not exec_task.done():
                        try:
                            feedback = await asyncio.wait_for(feedback_queue.get(), timeout=0.1)
                            yield f"data: {json.dumps(feedback)}\n\n"
                        except asyncio.TimeoutError:
                            continue
                    
                    await exec_task
                    
                    while not feedback_queue.empty():
                        feedback = await feedback_queue.get()
                        yield f"data: {json.dumps(feedback)}\n\n"
                    
                    # Get execution results
                    result = await db.execute(
                        select(CodeExecution)
                        .where(CodeExecution.message_id == auto_fix_assistant_msg.id)
                        .order_by(CodeExecution.timestamp)
                    )
                    fix_executions = result.scalars().all()
                    
                    for exec in fix_executions:
                        result = await db.execute(
                            select(File)
                            .where(File.execution_id == exec.id)
                            .order_by(File.timestamp)
                        )
                        files = result.scalars().all()
                        yield f"data: {json.dumps({'type': 'execution', 'execution': {'id': exec.id, 'language': exec.language, 'code': exec.code, 'output': exec.output, 'exit_code': exec.exit_code, 'duration': exec.duration, 'files': [{'id': f.id, 'filename': f.filename, 'size': len(f.content)} for f in files]}})}\n\n"
                    
                    total_duration = sum(e.duration for e in fix_executions)
                    
                    # Check ONLY the LAST execution for success
                    last_fix_exec = fix_executions[-1] if fix_executions else None
                    fix_success = last_fix_exec and last_fix_exec.exit_code == 0
                    
                    if fix_success:
                        yield f"data: {json.dumps({'type': 'auto_fix_complete', 'success': True, 'attempt': attempt, 'duration': total_duration})}\n\n"
                        should_autofix = False  # Exit loop - success!
                    else:
                        # Last execution failed - use it for next attempt
                        if last_fix_exec:
                            current_error_exec = last_fix_exec
                            if attempt < max_attempts:
                                yield f"data: {json.dumps({'type': 'auto_fix_retry', 'attempt': attempt, 'max_attempts': max_attempts})}\n\n"
                            # Continue loop with new error
                
                # Exhausted all attempts
                if attempt >= max_attempts and should_autofix:
                    yield f"data: {json.dumps({'type': 'auto_fix_complete', 'success': False, 'attempt': attempt, 'reason': f'Max attempts ({max_attempts}) reached'})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.websocket("/ws/terminal/{conversation_id}")
async def terminal_websocket(websocket: WebSocket, conversation_id: int):
    """WebSocket endpoint for interactive terminal access to container"""
    await websocket.accept()
    
    try:
        # Get or create container for this conversation
        container = executor.get_or_create_container(conversation_id)
        
        # Start bash in the container
        exec_instance = container.exec_run(
            ["/bin/bash"],
            stdin=True,
            stdout=True,
            stderr=True,
            tty=True,
            socket=True,
            workdir="/workspace"
        )
        
        # Get the socket for bidirectional communication
        sock = exec_instance.output
        sock._sock.setblocking(False)
        
        # Task to read from container and send to websocket
        async def read_from_container():
            loop = asyncio.get_event_loop()
            while True:
                try:
                    # Read from container socket
                    data = await loop.run_in_executor(None, sock._sock.recv, 4096)
                    if data:
                        # Send to websocket
                        await websocket.send_text(data.decode('utf-8', errors='replace'))
                    else:
                        break
                except Exception as e:
                    if "Resource temporarily unavailable" not in str(e):
                        print(f"Read error: {e}")
                        break
                await asyncio.sleep(0.01)
        
        # Task to read from websocket and send to container
        async def write_to_container():
            loop = asyncio.get_event_loop()
            while True:
                try:
                    # Receive from websocket
                    data = await websocket.receive_text()
                    if data:
                        # Send to container
                        await loop.run_in_executor(None, sock._sock.send, data.encode('utf-8'))
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    print(f"Write error: {e}")
                    break
        
        # Run both tasks concurrently
        await asyncio.gather(
            read_from_container(),
            write_to_container()
        )
        
    except Exception as e:
        print(f"Terminal error: {e}")
        try:
            await websocket.send_text(f"\r\nTerminal error: {str(e)}\r\n")
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@app.get("/api/files/{file_id}")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Download a file"""
    result = await db.execute(
        select(File).where(File.id == file_id)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    from fastapi.responses import Response
    return Response(
        content=file.content,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file.filename}"'
        }
    )


@app.get("/api/executions/{execution_id}/code")
async def download_execution_code(
    execution_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Download the executed code"""
    result = await db.execute(
        select(CodeExecution).where(CodeExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Generate filename based on language
    extensions = {
        'python': 'py',
        'py': 'py',
        'javascript': 'js',
        'js': 'js',
        'node': 'js',
        'bash': 'sh',
        'sh': 'sh',
        'shell': 'sh'
    }
    ext = extensions.get(execution.language.lower(), 'txt')
    filename = f"script_{execution_id}.{ext}"
    
    from fastapi.responses import Response
    return Response(
        content=execution.code,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.get("/api/executions/{execution_id}/output")
async def download_execution_output(
    execution_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Download the execution output"""
    result = await db.execute(
        select(CodeExecution).where(CodeExecution.id == execution_id)
    )
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    filename = f"output_{execution_id}.txt"
    output_content = execution.output or "No output"
    
    from fastapi.responses import Response
    return Response(
        content=output_content,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.get("/api/conversations/{conversation_id}/download-all-files")
async def download_all_files(conversation_id: int, db: AsyncSession = Depends(get_session)):
    """Download all files, scripts AND outputs from a conversation as ZIP"""
    import io
    import zipfile
    
    # Get all files for this conversation
    result = await db.execute(
        select(File)
        .join(CodeExecution)
        .join(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(File.timestamp)
    )
    files = result.scalars().all()
    
    # Get all code executions for this conversation
    result = await db.execute(
        select(CodeExecution)
        .join(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(CodeExecution.timestamp)
    )
    executions = result.scalars().all()
    
    if not files and not executions:
        raise HTTPException(status_code=404, detail="No files or scripts found")
    
    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Track filenames to avoid duplicates
        seen_names = {}
        
        # Add executed scripts
        for i, exec in enumerate(executions, 1):
            # Generate filename based on language
            extensions = {
                'python': 'py',
                'py': 'py',
                'javascript': 'js',
                'js': 'js',
                'node': 'js',
                'bash': 'sh',
                'sh': 'sh',
                'shell': 'sh'
            }
            ext = extensions.get(exec.language.lower(), 'txt')
            script_filename = f"scripts/script_{i}.{ext}"
            
            # Add script to ZIP
            zip_file.writestr(script_filename, exec.code)
            
            # Add output to ZIP
            output_filename = f"outputs/output_{i}.txt"
            output_content = exec.output or "No output"
            zip_file.writestr(output_filename, output_content)
        
        # Add generated files
        for file in files:
            # Handle duplicate filenames
            base_name = file.filename
            if base_name in seen_names:
                seen_names[base_name] += 1
                name, ext = base_name.rsplit('.', 1) if '.' in base_name else (base_name, '')
                filename = f"files/{name}_{seen_names[base_name]}.{ext}" if ext else f"files/{name}_{seen_names[base_name]}"
            else:
                seen_names[base_name] = 0
                filename = f"files/{base_name}"
            
            # Add file to ZIP
            zip_file.writestr(filename, file.content)
    
    zip_buffer.seek(0)
    
    from fastapi.responses import Response
    return Response(
        content=zip_buffer.getvalue(),
        media_type='application/zip',
        headers={
            'Content-Disposition': f'attachment; filename="conversation_{conversation_id}_complete.zip"'
        }
    )


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = FastAPIFile(...), db: AsyncSession = Depends(get_session)):
    """Transcribe audio using Whisper (local CPU or remote GPU)"""
    import tempfile
    import os
    
    # Validate audio file
    if not audio.content_type or not audio.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="Invalid audio file")
    
    # Save uploaded audio to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await audio.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name
    
    try:
        print(f"[TRANSCRIBE] Received audio file: {len(content)} bytes")
        
        # Get whisper client based on settings
        whisper_client = await get_whisper_client(db)
        
        # Get server URL for response
        result_for_db = await db.execute(select(Settings).where(Settings.key == "whisper_server_url"))
        setting = result_for_db.scalar_one_or_none()
        server_url = setting.value if setting and setting.value else os.getenv("WHISPER_SERVER_URL")
        
        # Transcribe (always async now)
        result = await whisper_client.transcribe_and_translate(temp_audio_path)
        
        # Add server info to result
        if server_url:
            result['server_url'] = server_url
        
        print(f"[TRANSCRIBE] Success: {result['language_name']} -> English")
        
        return result
        
    except Exception as e:
        print(f"[TRANSCRIBE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


@app.get("/api/whisper/status")
async def whisper_status(db: AsyncSession = Depends(get_session)):
    """Check Whisper server status"""
    import httpx
    
    # Get whisper URL from database or env
    result = await db.execute(select(Settings).where(Settings.key == "whisper_server_url"))
    setting = result.scalar_one_or_none()
    
    whisper_url = None
    if setting and setting.value:
        whisper_url = setting.value
    else:
        whisper_url = os.getenv("WHISPER_SERVER_URL")
    
    if not whisper_url:
        # Using local CPU whisper
        return {
            "enabled": False,
            "connected": False,
            "server_url": None,
            "model": "local-cpu"
        }
    
    # Check remote GPU server (whisper.cpp)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(whisper_url)
            
            if response.status_code == 200:
                # whisper.cpp returns HTML, not JSON
                # If we get 200, server is running
                return {
                    "enabled": True,
                    "connected": True,
                    "server_url": whisper_url,
                    "model": "large-v3"
                }
            else:
                return {
                    "enabled": True,
                    "connected": False,
                    "server_url": whisper_url,
                    "model": None
                }
    except Exception as e:
        print(f"[WHISPER STATUS] Error checking server: {e}")
        return {
            "enabled": True,
            "connected": False,
            "server_url": whisper_url,
            "model": None
        }


@app.post("/api/insert-output")
async def insert_output(
    request: InsertOutputRequest,
    db: AsyncSession = Depends(get_session)
):
    """Insert execution output as a new user message"""
    
    # Get execution
    result = await db.execute(
        select(CodeExecution).where(CodeExecution.id == request.execution_id)
    )
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Format output with exit code
    output_text = f"Exit code: {execution.exit_code}\n\n{execution.output}"
    
    # Create new user message with output
    user_message = Message(
        conversation_id=request.conversation_id,
        role="user",
        content=output_text
    )
    db.add(user_message)
    await db.commit()
    
    return {"message": "Output inserted successfully"}


# Serve frontend




# Settings Management
@app.get("/api/settings")
async def get_settings(db: AsyncSession = Depends(get_session)):
    """Get all settings"""
    import os
    
    # Default system prompt - can be overridden by SYSTEM_PROMPT env var
    default_system_prompt = os.getenv("SYSTEM_PROMPT", 
        "You are a professional coder who provides complete, executable code solutions. "
        "Present only code, no explanatory text or instructions on how to execute. "
        "Present code blocks in the order they should be executed. "
        "If dependencies are needed, install them first using a bash script. "
        "This approach gives the best results for automatic code execution."
    )
    
    # Default auto-fix prompt - can be overridden by AUTO_FIX_PROMPT env var
    default_auto_fix_prompt = os.getenv("AUTO_FIX_PROMPT",
        "The code execution failed with the following error(s):\n\n"
        "{errors}\n\n"
        "Please provide ONLY the fixed code in code blocks. Do not include any explanations, commentary, or text outside of code blocks. Just the working code."
    )
    
    # Default auto-fix max attempts
    default_auto_fix_max_attempts = os.getenv("AUTO_FIX_MAX_ATTEMPTS", "10")
    
    result = await db.execute(select(Settings))
    settings_list = result.scalars().all()
    
    # Convert to dict
    settings_dict = {s.key: s.value for s in settings_list}
    
    # Get docker timeout from env or default
    default_timeout = os.getenv("DOCKER_EXECUTION_TIMEOUT", "30")
    
    # Get docker export path from env or default
    default_export_path = os.getenv("DOCKER_EXPORT_PATH", "./docker_images_exported")
    
    # Set defaults if not exists
    defaults = {
        "docker_cpus": "2",
        "docker_memory": "8g",
        "docker_storage": "10g",
        "docker_timeout": default_timeout,
        "voice_enabled": "true",
        "view_mode": "auto",
        "system_prompt": default_system_prompt,
        "auto_fix_prompt": default_auto_fix_prompt,
        "auto_fix_max_attempts": default_auto_fix_max_attempts,
        "docker_export_path": default_export_path
    }
    
    for key, value in defaults.items():
        if key not in settings_dict:
            settings_dict[key] = value
    
    # Convert boolean strings to actual booleans
    if "voice_enabled" in settings_dict:
        settings_dict["voice_enabled"] = settings_dict["voice_enabled"].lower() == "true"
    
    # Check .env file for API keys if not in database
    if "anthropic_key" not in settings_dict or not settings_dict["anthropic_key"]:
        env_key = os.getenv("ANTHROPIC_API_KEY")
        if env_key and env_key != "your_key_here":
            settings_dict["anthropic_key"] = env_key
    
    if "openai_key" not in settings_dict or not settings_dict["openai_key"]:
        env_key = os.getenv("OPENAI_API_KEY")
        if env_key and env_key != "your_key_here":
            settings_dict["openai_key"] = env_key
    
    if "gemini_key" not in settings_dict or not settings_dict["gemini_key"]:
        env_key = os.getenv("GEMINI_API_KEY")
        if env_key and env_key != "your_key_here":
            settings_dict["gemini_key"] = env_key
    
    if "ollama_host" not in settings_dict:
        settings_dict["ollama_host"] = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    
    if "whisper_server_url" not in settings_dict:
        settings_dict["whisper_server_url"] = os.getenv("WHISPER_SERVER_URL", "")
    
    return settings_dict


@app.patch("/api/settings")
async def update_settings(settings: dict, db: AsyncSession = Depends(get_session)):
    """Update settings"""

    
    # Validate settings
    allowed_keys = ["docker_cpus", "docker_memory", "docker_storage", "docker_timeout", "anthropic_key", "openai_key", "gemini_key", "ollama_host", "whisper_server_url", "whisper_url", "voice_enabled", "view_mode", "system_prompt", "auto_fix_prompt", "auto_fix_max_attempts", "docker_export_path"]
    for key in settings.keys():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Invalid setting key: {key}")
    
    # Update or create settings
    for key, value in settings.items():
        result = await db.execute(select(Settings).where(Settings.key == key))
        setting = result.scalar_one_or_none()
        
        if setting:
            setting.value = str(value)
            setting.updated_at = datetime.utcnow()
        else:
            new_setting = Settings(key=key, value=str(value))
            db.add(new_setting)
    
    await db.commit()
    
    # Recreate executor with new settings (containers will be recreated on next use)
    global executor
    cpu_cores = int(settings.get("docker_cpus", "2"))
    memory = settings.get("docker_memory", "8g")
    storage = settings.get("docker_storage", "10g")
    timeout = int(settings.get("docker_timeout", "30"))
    
    executor = CodeExecutor(
        cpu_cores=cpu_cores,
        memory_limit=memory,
        storage_limit=storage,
        timeout=timeout
    )
    
    return {"message": "Settings updated", "settings": settings}


@app.get("/api/containers")
async def get_containers():
    """Get info about all running containers"""
    try:
        client = docker.from_env()
        all_containers = client.containers.list(all=True, filters={"ancestor": "ai-code-executor:latest"})
        
        containers_info = []
        for container in all_containers:
            try:
                # Get container details
                container.reload()
                
                # Parse environment variables to get conversation ID
                env_vars = container.attrs.get('Config', {}).get('Env', [])
                conversation_id = None
                for env in env_vars:
                    if env.startswith('CONVERSATION_ID='):
                        conversation_id = env.split('=', 1)[1]
                        break
                
                info = {
                    "id": container.id,
                    "conversation_id": conversation_id,
                    "status": container.status,
                    "created": container.attrs.get('Created', ''),
                }
                
                # Get stats only if running
                if container.status == 'running':
                    try:
                        stats = container.stats(stream=False)
                        
                        # CPU usage
                        cpu_stats = stats.get('cpu_stats', {})
                        precpu_stats = stats.get('precpu_stats', {})
                        
                        cpu_delta = cpu_stats.get('cpu_usage', {}).get('total_usage', 0) - \
                                  precpu_stats.get('cpu_usage', {}).get('total_usage', 0)
                        system_delta = cpu_stats.get('system_cpu_usage', 0) - \
                                     precpu_stats.get('system_cpu_usage', 0)
                        
                        online_cpus = cpu_stats.get('online_cpus', len(cpu_stats.get('cpu_usage', {}).get('percpu_usage', [1])))
                        cpu_percent = (cpu_delta / system_delta) * online_cpus * 100 if system_delta > 0 else 0
                        
                        # Memory usage
                        mem_stats = stats.get('memory_stats', {})
                        mem_usage = mem_stats.get('usage', 0)
                        mem_limit = mem_stats.get('limit', 0)
                        mem_percent = (mem_usage / mem_limit * 100) if mem_limit > 0 else 0
                        
                        info.update({
                            "cpu_percent": round(cpu_percent, 2),
                            "memory_usage": mem_usage,
                            "memory_limit": mem_limit,
                            "memory_percent": round(mem_percent, 2)
                        })
                    except Exception as e:
                        print(f"Error getting stats for {container.short_id}: {e}")
                        info.update({
                            "cpu_percent": 0,
                            "memory_usage": 0,
                            "memory_limit": 0,
                            "memory_percent": 0
                        })
                else:
                    info.update({
                        "cpu_percent": 0,
                        "memory_usage": 0,
                        "memory_limit": 0,
                        "memory_percent": 0
                    })
                
                containers_info.append(info)
                
            except Exception as e:
                print(f"Error processing container: {e}")
                continue
        
        return {"containers": containers_info}
        
    except Exception as e:
        print(f"Error listing containers: {e}")
        return {"containers": [], "error": str(e)}


@app.get("/api/conversations/{conversation_id}/container")
async def get_conversation_container(conversation_id: int):
    """Get container info for specific conversation"""
    if conversation_id not in executor.containers:
        raise HTTPException(status_code=404, detail="No container for this conversation")
    
    container = executor.containers[conversation_id]
    
    try:
        container.reload()
        stats = container.stats(stream=False)
        
        # CPU usage
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
        cpu_percent = (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100 if system_delta > 0 else 0
        
        # Memory usage
        mem_usage = stats['memory_stats'].get('usage', 0)
        mem_limit = stats['memory_stats'].get('limit', 0)
        mem_percent = (mem_usage / mem_limit * 100) if mem_limit > 0 else 0
        
        return {
            "conversation_id": conversation_id,
            "container_id": container.short_id,
            "full_id": container.id,
            "status": container.status,
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage": mem_usage,
            "memory_limit": mem_limit,
            "memory_percent": round(mem_percent, 2),
            "created": container.attrs['Created']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting container stats: {str(e)}")


# Multi-Provider Client Manager
class AIClientManager:
    def __init__(self):
        self.anthropic_client = None
        self.openai_client = None
        self.gemini_client = None
        self.ollama_client = OllamaClient()
        
    async def get_client_for_model(self, model: str, db: AsyncSession):
        """Get appropriate client based on model name"""
        # Model name mapper for backwards compatibility
        model_map = {
            'claude-sonnet-4': 'claude-sonnet-4-20250514',
            'claude-opus-4': 'claude-opus-4-20250514',
            'claude-sonnet-3.5': 'claude-3-5-sonnet-20241022',
            'claude-haiku-3.5': 'claude-3-5-haiku-20241022',
            # Legacy OpenAI models
            'gpt-4-turbo-preview': 'gpt-4o',
            'gpt-4': 'gpt-4o',
            'gpt-4-32k': 'gpt-4o',
            'gpt-3.5-turbo': 'gpt-4o-mini',
            'gpt-3.5-turbo-16k': 'gpt-4o-mini',
            # Legacy Gemini models
            'gemini-pro': 'gemini-2.5-flash',
            'gemini-pro-vision': 'gemini-2.5-flash',
            'gemini-1.5-pro': 'gemini-2.5-pro',
            'gemini-1.5-flash': 'gemini-2.5-flash'
        }
        
        # Map old model names to new ones
        if model in model_map:
            model = model_map[model]
        
        # Load API keys from settings
        result = await db.execute(select(Settings))
        settings_list = result.scalars().all()
        settings = {s.key: s.value for s in settings_list}
        
        if model.startswith('claude-'):
            if not self.anthropic_client or settings.get('anthropic_key'):
                from backend.anthropic_client import claude_client
                self.anthropic_client = claude_client
            return self.anthropic_client, 'anthropic', model
            
        elif model.startswith('gpt-'):
            if not self.openai_client:
                from backend.openai_client import OpenAIClient
                api_key = settings.get('openai_key')
                self.openai_client = OpenAIClient(api_key=api_key)
            return self.openai_client, 'openai', model
            
        elif model.startswith('gemini-'):
            if not self.gemini_client:
                from backend.gemini_client import GeminiClient
                api_key = settings.get('gemini_key')
                self.gemini_client = GeminiClient(api_key=api_key)
            return self.gemini_client, 'gemini', model
            
        elif model.startswith('ollama:'):
            return self.ollama_client, 'ollama', model
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model}")

# Global client manager
ai_manager = AIClientManager()


@app.delete("/api/containers/{container_id}")
async def stop_container(container_id: str):
    """Stop and remove a specific container"""
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove()
        
        # Remove from executor.containers if exists
        for conv_id, cont in list(executor.containers.items()):
            if cont.id == container_id:
                del executor.containers[conv_id]
                break
        
        return {"message": "Container stopped and removed"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/containers/cleanup")
async def cleanup_containers():
    """Remove all stopped containers for this app"""
    try:
        client = docker.from_env()
        containers = client.containers.list(
            all=True,
            filters={"ancestor": "ai-code-executor:latest", "status": "exited"}
        )
        
        removed = 0
        for container in containers:
            try:
                container.remove()
                removed += 1
            except Exception as e:
                print(f"Error removing container {container.short_id}: {e}")
        
        # Clean up executor.containers dict
        for conv_id in list(executor.containers.keys()):
            try:
                executor.containers[conv_id].reload()
            except docker.errors.NotFound:
                del executor.containers[conv_id]
        
        return {"removed": removed, "message": f"Removed {removed} container(s)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve frontend
@app.get("/api/conversations/{conversation_id}/files")
async def list_conversation_files(
    conversation_id: int,
    db: AsyncSession = Depends(get_session)
):
    """List all files in conversation's container workspace"""
    # Verify conversation exists
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get container
    if conversation_id not in executor.containers:
        return {"files": [], "message": "No container active"}
    
    container = executor.containers[conversation_id]
    
    try:
        # Check if container is running
        container.reload()
        if container.status != 'running':
            return {"files": [], "message": "Container not running"}
        
        print(f"Listing files for conversation {conversation_id}, container {container.short_id}")
        
        # Simple approach: just list files in /workspace
        exec_result = container.exec_run(
            ["sh", "-c", "cd /workspace && ls -la"],
        )
        
        print(f"Exit code: {exec_result.exit_code}")
        print(f"Output: {exec_result.output.decode('utf-8')}")
        
        if exec_result.exit_code != 0:
            return {"files": [], "error": "Failed to list files"}
        
        # Parse ls -la output
        output = exec_result.output.decode('utf-8').strip()
        
        if not output:
            return {"files": []}
        
        lines = output.split('\n')[1:]  # Skip "total X" line
        files = []
        
        for line in lines:
            if not line.strip():
                continue
            
            parts = line.split(None, 8)  # Split on whitespace, max 9 parts
            if len(parts) < 9:
                continue
            
            permissions = parts[0]
            size = int(parts[4]) if parts[4].isdigit() else 0
            name = parts[8]
            
            # Skip . and ..
            if name in ['.', '..']:
                continue
            
            file_type = 'directory' if permissions.startswith('d') else 'file'
            
            files.append({
                "path": name,
                "full_path": f"/workspace/{name}",
                "type": file_type,
                "size": size,
                "modified": 0,
                "name": name
            })
        
        print(f"Found {len(files)} files: {[f['name'] for f in files]}")
        return {"files": files}
        
    except Exception as e:
        print(f"Error listing files: {e}")
        import traceback
        traceback.print_exc()
        return {"files": [], "error": str(e)}



@app.get("/api/conversations/{conversation_id}/files/{file_path:path}")
async def get_file_content(
    conversation_id: int,
    file_path: str,
    db: AsyncSession = Depends(get_session)
):
    """Get content of a specific file"""
    print(f"GET file content: conversation_id={conversation_id}, file_path={file_path}")
    
    # Verify conversation exists
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        print(f"Conversation {conversation_id} not found")
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get container
    if conversation_id not in executor.containers:
        print(f"No container for conversation {conversation_id}")
        print(f"Available containers: {list(executor.containers.keys())}")
        raise HTTPException(status_code=404, detail="No container active")
    
    container = executor.containers[conversation_id]
    print(f"Found container: {container.short_id}")
    
    try:
        # Construct full path
        full_path = f"/workspace/{file_path}"
        print(f"Trying to read file: {full_path}")
        
        # Check file size first
        size_result = container.exec_run(
            ["sh", "-c", f"stat -c '%s' {full_path} 2>/dev/null || echo '0'"]
        )
        
        file_size = 0
        try:
            file_size = int(size_result.output.decode('utf-8').strip())
        except:
            pass
        
        print(f"File size: {file_size} bytes")
        
        # Limit: 1MB for viewing, larger files show truncated
        MAX_VIEW_SIZE = 1 * 1024 * 1024  # 1MB
        
        if file_size > MAX_VIEW_SIZE:
            # File too large - return truncated with warning
            print(f"File too large ({file_size} bytes), returning first 1MB")
            
            exec_result = container.exec_run(
                ["sh", "-c", f"head -c {MAX_VIEW_SIZE} {full_path}"]
            )
            
            if exec_result.exit_code != 0:
                print(f"Failed to read file: {exec_result.output.decode('utf-8')}")
                raise HTTPException(status_code=500, detail="Failed to read file")
            
            content = exec_result.output.decode('utf-8', errors='replace')
            
            # Get file extension
            extension = file_path.split('.')[-1] if '.' in file_path else ''
            
            print(f"Returning truncated file: {len(content)} bytes")
            
            return {
                "path": file_path,
                "content": content,
                "extension": extension,
                "size": file_size,
                "truncated": True,
                "truncated_at": MAX_VIEW_SIZE,
                "message": f"File is {file_size / (1024*1024):.1f}MB. Showing first {MAX_VIEW_SIZE / (1024*1024):.1f}MB only. Download to view complete file."
            }
        
        # File is small enough - read completely
        # Check if file exists
        check_result = container.exec_run(
            ["sh", "-c", f"test -f {full_path} && echo 'exists'"]
        )
        
        print(f"File exists check - exit_code: {check_result.exit_code}, output: {check_result.output}")
        
        if check_result.exit_code != 0 or b'exists' not in check_result.output:
            print(f"File not found: {full_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        print(f"File exists, reading content...")
        
        # Read file content
        exec_result = container.exec_run(
            ["cat", full_path]
        )
        
        print(f"Read file - exit_code: {exec_result.exit_code}, size: {len(exec_result.output)}")
        
        if exec_result.exit_code != 0:
            print(f"Failed to read file: {exec_result.output.decode('utf-8')}")
            raise HTTPException(status_code=500, detail="Failed to read file")
        
        content = exec_result.output.decode('utf-8', errors='replace')
        
        # Get file extension
        extension = file_path.split('.')[-1] if '.' in file_path else ''
        
        print(f"Successfully read file, returning {len(content)} bytes")
        
        return {
            "path": file_path,
            "content": content,
            "extension": extension,
            "size": len(content),
            "truncated": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error reading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conversations/{conversation_id}/upload")
async def upload_file_to_container(
    conversation_id: int,
    file: UploadFile,
    db: AsyncSession = Depends(get_session)
):
    """Upload a file to conversation's container workspace"""
    # Verify conversation exists
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get or create container
    if conversation_id not in executor.containers:
        # Create container if it doesn't exist
        container = executor.get_or_create_container(conversation_id)
    else:
        container = executor.containers[conversation_id]
    
    try:
        # Read file content
        content = await file.read()
        
        print(f"Uploading file: {file.filename} ({len(content)} bytes) to conversation {conversation_id}")
        
        # Write file to container using tar (Docker best practice for file upload)
        import tarfile
        import io
        
        # Create tar archive in memory
        tar_stream = io.BytesIO()
        tar = tarfile.TarFile(fileobj=tar_stream, mode='w')
        
        # Add file to tar
        tarinfo = tarfile.TarInfo(name=file.filename)
        tarinfo.size = len(content)
        tar.addfile(tarinfo, io.BytesIO(content))
        tar.close()
        
        # Upload tar to container
        tar_stream.seek(0)
        container.put_archive('/workspace', tar_stream.read())
        
        print(f"Successfully uploaded {file.filename}")
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "size": len(content),
            "path": f"/workspace/{file.filename}"
        }
        
    except Exception as e:
        print(f"Error uploading file: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


# ============================================================================
# Docker Image Export Endpoints
# ============================================================================

async def get_docker_export_path(db: AsyncSession) -> str:
    """Get the docker export path from settings or env"""
    result = await db.execute(select(Settings).where(Settings.key == "docker_export_path"))
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        return setting.value
    return os.getenv("DOCKER_EXPORT_PATH", "./docker_images_exported")


@app.post("/api/conversations/{conversation_id}/export-container")
async def export_container(
    conversation_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Export a conversation's Docker container as an image"""
    import subprocess
    from pathlib import Path
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get container ID
    container_id = conversation.container_id
    if not container_id:
        raise HTTPException(status_code=400, detail="No container exists for this conversation. Run some code first.")
    
    # Check container exists
    try:
        docker_client = docker.from_env()
        container = docker_client.containers.get(container_id)
    except docker.errors.NotFound:
        raise HTTPException(status_code=400, detail="Container no longer exists. Run some code to create a new one.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker error: {str(e)}")
    
    # Get export path from settings
    export_path = await get_docker_export_path(db)
    export_dir = Path(export_path)
    export_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate image name
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    if conversation.title and conversation.title != "New Conversation":
        # Sanitize title for filename
        safe_title = re.sub(r'[^\w\s-]', '', conversation.title).strip()
        safe_title = re.sub(r'[-\s]+', '-', safe_title)[:50]
        image_name = f"{safe_title}_{timestamp}"
    else:
        image_name = f"conversation-{conversation_id}_{timestamp}"
    
    tar_filename = f"{image_name}.tar"
    tar_path = export_dir / tar_filename
    
    try:
        # Step 1: Commit container to image
        print(f"Committing container {container_id} to image {image_name}...")
        image = container.commit(repository=image_name, tag="latest")
        print(f"Created image: {image.id}")
        
        # Step 2: Save image to tar file
        print(f"Saving image to {tar_path}...")
        with open(tar_path, 'wb') as f:
            for chunk in image.save(named=True):
                f.write(chunk)
        
        # Get file size
        file_size = tar_path.stat().st_size
        
        print(f"Successfully exported to {tar_path} ({file_size} bytes)")
        
        return {
            "success": True,
            "message": f"Container exported successfully",
            "filename": tar_filename,
            "path": str(tar_path),
            "size": file_size,
            "image_name": f"{image_name}:latest"
        }
        
    except Exception as e:
        print(f"Error exporting container: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to export container: {str(e)}")


@app.get("/api/docker-images")
async def list_docker_images(db: AsyncSession = Depends(get_session)):
    """List all exported Docker images"""
    from pathlib import Path
    
    export_path = await get_docker_export_path(db)
    export_dir = Path(export_path)
    
    if not export_dir.exists():
        return {"images": [], "export_path": str(export_dir)}
    
    images = []
    for tar_file in export_dir.glob("*.tar"):
        stat = tar_file.stat()
        images.append({
            "filename": tar_file.name,
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "path": str(tar_file)
        })
    
    # Sort by creation date, newest first
    images.sort(key=lambda x: x["created"], reverse=True)
    
    return {"images": images, "export_path": str(export_dir)}


@app.get("/api/docker-images/{filename}/download")
async def download_docker_image(
    filename: str,
    db: AsyncSession = Depends(get_session)
):
    """Download an exported Docker image"""
    from pathlib import Path
    
    # Validate filename (prevent path traversal)
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    export_path = await get_docker_export_path(db)
    tar_path = Path(export_path) / filename
    
    if not tar_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    
    def iter_file():
        with open(tar_path, 'rb') as f:
            while chunk := f.read(8192):
                yield chunk
    
    return StreamingResponse(
        iter_file(),
        media_type="application/x-tar",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(tar_path.stat().st_size)
        }
    )


@app.delete("/api/docker-images/{filename}")
async def delete_docker_image(
    filename: str,
    db: AsyncSession = Depends(get_session)
):
    """Delete an exported Docker image"""
    from pathlib import Path
    
    # Validate filename (prevent path traversal)
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    export_path = await get_docker_export_path(db)
    tar_path = Path(export_path) / filename
    
    if not tar_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    
    try:
        tar_path.unlink()
        return {"success": True, "message": f"Deleted {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")






