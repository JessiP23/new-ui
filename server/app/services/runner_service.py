import logging
from datetime import datetime, timezone
from typing import Any, Dict
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
    existing = (
        supabase
        .table("evaluations")
        .select("id")
        .eq("submission_id", payload["submission_id"])
        .eq("question_id", payload["question_id"])
        .eq("judge_id", payload["judge_id"])
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]
    supabase.table("evaluations").insert(payload).execute()

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