import asyncio
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict
import backoff
from dotenv import load_dotenv
from app.core.llm import (
    get_anthropic_client,
    get_gemini_client,
    get_groq_client,
    get_openai_client,
)
from app.core.supabase import get_supabase_client
from app.services.runner_service import run_ai_judge_job

load_dotenv()

CONCURRENCY = 4
BATCH_SIZE = 10
POLL_INTERVAL = 5.0
JUDGES_REFRESH = 60

def should_retry(exc: Exception) -> bool:
    err_str = str(exc).lower()
    return "rate limit" in err_str or "timeout" in err_str or "429" in err_str

@backoff.on_exception(
    backoff.expo,
    Exception,
    max_tries=10,
    jitter=backoff.random_jitter,
    giveup=lambda exc: not should_retry(exc),
)
async def process_job(job: Dict[str, Any], judges_map: Dict[str, Dict[str, Any]]):
    supabase = get_supabase_client()
    provider_clients = {
        "groq": get_groq_client(),
        "openai": get_openai_client(),
        "anthropic": get_anthropic_client(),
        "gemini": get_gemini_client(),
    }
    filtered_clients = {key: value for key, value in provider_clients.items() if value is not None}
    await run_ai_judge_job(job, judges_map, supabase, filtered_clients)

async def fetch_judges_map() -> Dict[str, Dict[str, Any]]:
    supabase = get_supabase_client()
    response = supabase.table("judges").select("*").execute()
    return {str(judge["id"]): judge for judge in (response.data or [])}

async def worker_loop():
    judges_map: Dict[str, Dict[str, Any]] = {}
    last_judges_fetch = 0.0
    supabase = get_supabase_client()

    while True:
        try:
            now = time.time()
            if now - last_judges_fetch > JUDGES_REFRESH or not judges_map:
                judges_map = await fetch_judges_map()
                last_judges_fetch = now

            resp = supabase.table("judge_jobs").select("*").eq("status", "pending").limit(BATCH_SIZE).execute()
            jobs = resp.data or []
            if not jobs:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            judges_map = await fetch_judges_map()
            job_ids = [job["id"] for job in jobs]
            supabase.table("judge_jobs").update(
                {"status": "running", "updated_at": datetime.now(timezone.utc).isoformat()}
            ).in_("id", job_ids).execute()

            sem = asyncio.Semaphore(CONCURRENCY)

            async def run_with_sem(job: Dict[str, Any]):
                async with sem:
                    await process_job(job, judges_map)

            await asyncio.gather(*(run_with_sem(job) for job in jobs))
        except Exception:  # noqa: BLE001
            await asyncio.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        pass