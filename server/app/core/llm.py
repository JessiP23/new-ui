import os
from functools import lru_cache
from typing import Any, Optional
from groq import AsyncGroq
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import google.generativeai as genai

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

@lru_cache
def get_anthropic_client() -> Optional[Any]:
    api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return AsyncAnthropic(api_key=api_key)

@lru_cache
def get_gemini_client() -> Optional[Any]:
    api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai