import os
from typing import List, Dict, AsyncGenerator, Optional
from dotenv import load_dotenv

load_dotenv()

# Try to import anthropic, but make it optional
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    anthropic = None


class ClaudeClient:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self._client = None
        self._initialized = False
        
        # Available models
        self.models = {
            "claude-sonnet-4-20250514": "Claude Sonnet 4",
            "claude-opus-4-20250514": "Claude Opus 4",
            "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
            "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
        }
    
    @property
    def available(self) -> bool:
        """Check if Claude client can be used"""
        return ANTHROPIC_AVAILABLE and bool(self.api_key)
    
    @property
    def client(self):
        """Lazy initialization of the Anthropic client"""
        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError("anthropic package is not installed")
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not configured. Please add it in Settings.")
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
        if not self.available:
            yield "Error: Anthropic API key not configured. Please add it in Settings."
            return
            
        # Default system prompt from env or hardcoded fallback
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
        try:
            async with self.client.messages.stream(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            yield f"\nError communicating with Anthropic API: {str(e)}"
    
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
        if not self.available:
            return "Error: Anthropic API key not configured. Please add it in Settings."
            
        # Default system prompt from env or hardcoded fallback
        if system_prompt is None:
            system_prompt = os.getenv("SYSTEM_PROMPT",
                "You are a professional coder who provides complete, executable code solutions. "
                "Present only code, no explanatory text or instructions on how to execute. "
                "Present code blocks in the order they should be executed. "
                "If dependencies are needed, install them first using a bash script. "
                "This approach gives the best results for automatic code execution."
            )
        
        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            return f"Error communicating with Anthropic API: {str(e)}"
    
    def get_available_models(self) -> Dict[str, str]:
        """Return available models"""
        return self.models


# Global client instance - using lazy initialization
claude_client = ClaudeClient()
