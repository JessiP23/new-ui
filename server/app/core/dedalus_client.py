import asyncio
import os
from typing import AsyncIterator, Optional
from dotenv import load_dotenv
from dedalus_labs import AsyncDedalus, DedalusRunner
from dedalus_labs.utils.streaming import stream_async

load_dotenv()

DEDALUS_API_KEY = 'dsk_test_353c6da193e7_a1ad2fed83ad196e1c6c300b542b6c43'
DEDALUS_DEFAULT_MODEL = os.getenv("DEDALUS_MODEL", "openai/gpt-5-mini")

class DedalusClient:
    def __init__(self, api_key: Optional[str] = None):
        self.client = AsyncDedalus()
        self.runner = DedalusRunner(self.client)

    async def run_agent(self, input_text: str, model: Optional[str] = None, timeout: int = 60):
        model = model or DEDALUS_DEFAULT_MODEL
        try:
            coro = self.runner.run(input=input_text, model=model)
            response = await asyncio.wait_for(coro, timeout=timeout)
            return response
        except asyncio.TimeoutError:
            raise
        except Exception:
            raise

    async def stream_agent(self, input_text: str, model: Optional[str] = None) -> AsyncIterator[str]:
        model = model or DEDALUS_DEFAULT_MODEL
        async for chunk in stream_async(self.runner.run(input=input_text, model=model)):
            yield chunk