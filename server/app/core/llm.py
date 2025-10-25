import os
from functools import lru_cache
from typing import Optional
from groq import AsyncGroq
from openai import AsyncOpenAI

@lru_cache
def get_groq_client() -> AsyncGroq:
    api_key: Optional[str] = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set")
    return AsyncGroq(api_key=api_key)

@lru_cache
def get_openai_client() -> Optional[AsyncOpenAI]:
    api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return AsyncOpenAI(api_key=api_key)