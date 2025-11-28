import os
import json
import httpx
from typing import List, Dict, AsyncGenerator, Optional


class LMStudioClient:
    """Client for LM Studio local LLM server (OpenAI-compatible API)"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("LMSTUDIO_HOST", "http://localhost:1234")
        self.available = False
        self._available_models = []
    
    # Models to exclude from the list (not usable for chat)
    EXCLUDED_MODELS = [
        'text-embedding-nomic-embed-text-v1.5',
    ]
    
    def _is_usable_model(self, model_id: str) -> bool:
        """Check if model is usable for chat completions"""
        return model_id not in self.EXCLUDED_MODELS
    
    async def check_availability(self) -> bool:
        """Check if LM Studio is running and accessible"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/v1/models")
                self.available = response.status_code == 200
                
                if self.available:
                    data = response.json()
                    # LM Studio returns OpenAI-compatible format
                    # Filter out embedding models and other non-chat models
                    self._available_models = [
                        model['id'] for model in data.get('data', [])
                        if self._is_usable_model(model['id'])
                    ]
                
                return self.available
        except Exception as e:
            print(f"LM Studio not available at {self.base_url}: {e}")
            self.available = False
            return False
    
    def get_available_models(self) -> List[str]:
        """Get list of available LM Studio models"""
        return self._available_models
    
    async def list_models(self) -> List[str]:
        """List available LM Studio models (async version)"""
        await self.check_availability()
        return self._available_models
    
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from LM Studio
        Yields text chunks as they arrive
        """
        if not self.available:
            await self.check_availability()
            if not self.available:
                yield f"Error: LM Studio not available at {self.base_url}. Make sure LM Studio is running with a model loaded."
                return
        
        # Default system prompt
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
        # Format messages for LM Studio (OpenAI-compatible format)
        lmstudio_messages = []
        
        # Add system message if provided
        if system_prompt:
            lmstudio_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add conversation messages
        for msg in messages:
            lmstudio_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Strip lmstudio: prefix if present
        if model and model.startswith('lmstudio:'):
            model = model.replace('lmstudio:', '')
        
        # Use first available model if none specified
        if not model and self._available_models:
            model = self._available_models[0]
        
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": lmstudio_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/v1/chat/completions",
                    headers=headers,
                    json=data
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"Error: LM Studio returned status {response.status_code}: {error_text.decode()}"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            if line.strip() == "data: [DONE]":
                                break
                            
                            try:
                                chunk_data = json.loads(line[6:])
                                if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                    delta = chunk_data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                                
        except httpx.ConnectError:
            yield f"Error: Cannot connect to LM Studio at {self.base_url}. Is it running?"
        except Exception as e:
            yield f"Error communicating with LM Studio: {str(e)}"
    
    async def get_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> str:
        """Get full completion from LM Studio (non-streaming)"""
        result = []
        async for chunk in self.stream_completion(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system_prompt=system_prompt
        ):
            result.append(chunk)
        return "".join(result)


# Global client instance - lazy initialization
lmstudio_client = LMStudioClient()
