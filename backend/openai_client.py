import os
from typing import AsyncGenerator
import httpx

class OpenAIClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = "https://api.openai.com/v1"
        
    async def generate_stream(
        self,
        model: str,
        messages: list,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Stream response from OpenAI API"""
        
        if not self.api_key:
            yield "Error: OpenAI API key not configured. Please add it in Settings."
            return
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=data
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            if line.strip() == "data: [DONE]":
                                break
                            
                            try:
                                import json
                                data = json.loads(line[6:])
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield delta["content"]
                            except json.JSONDecodeError:
                                continue
                                
            except httpx.HTTPStatusError as e:
                yield f"\nError: OpenAI API returned status {e.response.status_code}"
            except Exception as e:
                yield f"\nError communicating with OpenAI: {str(e)}"
    
    async def stream_completion(
        self,
        messages: list,
        model: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: str = None
    ) -> AsyncGenerator[str, None]:
        """Stream response (alias for generate_stream with system message injection)"""
        # Default system prompt
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
        # Format messages with system prompt first
        openai_messages = []
        
        # Add system message if provided
        if system_prompt:
            openai_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add conversation messages
        for msg in messages:
            openai_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        async for chunk in self.generate_stream(model, openai_messages, max_tokens, temperature):
            yield chunk
    
    def get_available_models(self) -> list:
        """Return list of available OpenAI models"""
        return [
            "gpt-5.1",
            "gpt-5",
            "gpt-5-mini",
            "gpt-4.1",
            "gpt-4.1-mini",
            "gpt-4o",
            "gpt-4o-mini"
        ]
