import anthropic
import os
from typing import List, Dict, AsyncGenerator, Optional
from dotenv import load_dotenv

load_dotenv()


class ClaudeClient:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
        self._client: Optional[anthropic.AsyncAnthropic] = None
        
        # Available models
        self.models = {
            "claude-sonnet-4-20250514": "Claude Sonnet 4",
            "claude-opus-4-20250514": "Claude Opus 4",
            "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
            "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
        }
    
    @property
    def client(self) -> anthropic.AsyncAnthropic:
        """Lazy initialization of the Anthropic client"""
        if self._client is None:
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
        return self._client
    
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from Claude
        Yields text chunks as they arrive
        """
        # Default system prompt from env or hardcoded fallback
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
        async with self.client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    async def get_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Get full completion from Claude (non-streaming)
        """
        # Default system prompt from env or hardcoded fallback
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
        response = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages
        )
        return response.content[0].text
    
    def get_available_models(self) -> Dict[str, str]:
        """Return available models"""
        return self.models


# Global client instance - using lazy initialization
claude_client = ClaudeClient()
