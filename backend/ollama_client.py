import httpx
import os
from typing import List, Dict, AsyncGenerator, Optional
import json


class OllamaClient:
    """Client for Ollama local LLM"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.available = False
        self._available_models = []
    
    async def check_availability(self) -> bool:
        """Check if Ollama is running and accessible"""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                self.available = response.status_code == 200
                
                if self.available:
                    data = response.json()
                    self._available_models = [model['name'] for model in data.get('models', [])]
                
                return self.available
        except Exception as e:
            print(f"Ollama not available: {e}")
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
        
        if not self.available:
            await self.check_availability()
            if not self.available:
                raise Exception("Ollama is not available. Make sure Ollama is running.")
        
        # Default system prompt from env or hardcoded fallback
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
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
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    'POST',
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": ollama_messages,
                        "stream": True
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                
                                # Check if stream is done
                                if data.get('done', False):
                                    break
                                
                                if 'message' in data:
                                    content = data['message'].get('content', '')
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
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
