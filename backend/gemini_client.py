import os
from typing import AsyncGenerator
import httpx

class GeminiClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
    async def generate_stream(
        self,
        model: str,
        messages: list,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Stream response from Gemini API"""
        
        if not self.api_key:
            yield "Error: Gemini API key not configured. Please add it in Settings."
            return
        
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
        
        data = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        
        # Extract model name (e.g., "gemini-pro" from "gemini-pro")
        model_name = model.replace("models/", "")
        url = f"{self.base_url}/models/{model_name}:streamGenerateContent?key={self.api_key}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                async with client.stream(
                    "POST",
                    url,
                    json=data
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                import json
                                # Gemini sends JSON arrays
                                if line.startswith('['):
                                    data_list = json.loads(line)
                                    for data in data_list:
                                        if "candidates" in data:
                                            for candidate in data["candidates"]:
                                                if "content" in candidate and "parts" in candidate["content"]:
                                                    for part in candidate["content"]["parts"]:
                                                        if "text" in part:
                                                            yield part["text"]
                                else:
                                    data = json.loads(line)
                                    if "candidates" in data:
                                        for candidate in data["candidates"]:
                                            if "content" in candidate and "parts" in candidate["content"]:
                                                for part in candidate["content"]["parts"]:
                                                    if "text" in part:
                                                        yield part["text"]
                            except json.JSONDecodeError:
                                continue
                                
            except httpx.HTTPStatusError as e:
                yield f"\nError: Gemini API returned status {e.response.status_code}"
            except Exception as e:
                yield f"\nError communicating with Gemini: {str(e)}"
    
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
        gemini_messages = []
        
        # Add system message as user role (Gemini doesn't have 'system' role)
        if system_prompt:
            gemini_messages.append({
                "role": "user",
                "content": system_prompt
            })
        
        # Add conversation messages
        for msg in messages:
            gemini_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        async for chunk in self.generate_stream(model, gemini_messages, max_tokens, temperature):
            yield chunk
    
    def get_available_models(self) -> list:
        """Return list of available Gemini models"""
        return [
            "gemini-2.5-pro",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash"
        ]
