import logging
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import HTTPException
from groq import AsyncGroq
from openai import AsyncOpenAI
from supabase import Client
from app.services.judge_service import run_single_judge

async def run_ai_judge_job(
    job: Dict[str, Any],
    judges_map: Dict[str, Dict[str, Any]],
    supabase: Client,
    groq_client: AsyncGroq,
    openai_client: AsyncOpenAI | None,
):
    job_id = job["id"]
    try:
        evaluation = await run_single_judge(
            job["submission_id"],
            job.get("submission_data") or {},
            job["question_id"],
            str(job["judge_id"]),
            {},
            groq_client,
            openai_client,
            judges_map,
        )
        if evaluation:
            evaluation.setdefault("queue_id", job.get("queue_id"))
            evaluation.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            evaluation.setdefault("updated_at", datetime.now(timezone.utc).isoformat())
            _insert_evaluation(supabase, evaluation)
        supabase.table("judge_jobs").update(
            {"status": "done", "updated_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", job_id).execute()
    except Exception as exc: 
        logging.exception("Job failed %s", job_id)
        _mark_job_failed(supabase, job, exc)

def _insert_evaluation(supabase: Client, payload: Dict[str, Any]):
    attempts = 0
    while attempts < max(5, len(payload)):
        try:
            supabase.table("evaluations").insert(payload).execute()
            return
        except Exception as exc: 
            msg = str(exc)
            if "Could not find the" in msg:
                missing_col = _extract_missing_column(msg)
                if missing_col and missing_col in payload:
                    payload.pop(missing_col, None)
                    attempts += 1
                    continue
            raise

def _extract_missing_column(message: str) -> str | None:
    import re

    match = re.search(r"Could not find the '([a-zA-Z0-9_]+)' column", message)
    if match:
        return match.group(1)
    return None

def _mark_job_failed(supabase: Client, job: Dict[str, Any], exc: Exception):
    attempts = (job.get("attempts") or 0) + 1
    status = "failed" if attempts >= 3 else "pending"
    supabase.table("judge_jobs").update(
        {
            "status": status,
            "attempts": attempts,
            "last_error": str(exc),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", job["id"]).execute()