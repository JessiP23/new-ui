import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import HTTPException
from supabase import Client

async def stream_live_status(supabase: Client, queue_id: str):
    try:
        while True:
            try:
                payload = get_job_status(supabase, queue_id)
                yield payload
                counts = payload["counts"]
                if counts.get("pending", 0) + counts.get("running", 0) == 0 and payload["total"] > 0:
                    break
            except Exception:
                logging.exception("Error inside live status generator")
            await asyncio.sleep(1.0)
    except asyncio.CancelledError:
        logging.info("SSE client disconnected for queue %s", queue_id)

def get_job_status(supabase: Client, queue_id: str) -> Dict[str, Any]:
    statuses = ["pending", "running", "done", "failed"]
    counts = {}
    for status in statuses:
        resp = supabase.table("judge_jobs").select("id", count="exact").eq("queue_id", queue_id).eq("status", status).execute()
        counts[status] = resp.count or 0
    total_resp = supabase.table("judge_jobs").select("id", count="exact").eq("queue_id", queue_id).execute()
    total = total_resp.count or 0
    return {"counts": counts, "total": total}

def debug_queue(supabase: Client, queue_id: str) -> Dict[str, int]:
    tables = ["submissions", "assignments", "judge_jobs"]
    summary = {}
    for table in tables:
        resp = supabase.table(table).select("id", count="exact").eq("queue_id", queue_id).execute()
        summary[table] = resp.count or 0
    return summary