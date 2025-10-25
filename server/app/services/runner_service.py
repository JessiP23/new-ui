from datetime import datetime, timezone
from typing import Any, Dict, Optional
from supabase import Client
from app.services.judge_service import run_single_judge

async def run_ai_judge_job(
    job: Dict[str, Any],
    judges_map: Dict[str, Dict[str, Any]],
    supabase: Client,
    provider_clients: Dict[str, Any],
):
    job_id = job["id"]
    try:
        evaluation = await run_single_judge(
            submission_id=job["submission_id"],
            submission_data=job.get("submission_data") or {},
            question_id=job["question_id"],
            judge_id=str(job["judge_id"]),
            provider_clients=provider_clients,
            judges=judges_map,
        )
        if evaluation:
            evaluation.setdefault("queue_id", job.get("queue_id"))
            _upsert_evaluation(supabase, evaluation)
        supabase.table("judge_jobs").update(
            {"status": "done", "updated_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", job_id).execute()
    except Exception as exc:
        _mark_job_failed(supabase, job, exc)

def _fetch_existing_evaluation(supabase: Client, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    response = (
        supabase.table("evaluations")
        .select("id, verdict, reasoning, reasoning_simhash, queue_id, created_at")
        .eq("submission_id", payload["submission_id"])
        .eq("question_id", payload["question_id"])
        .eq("judge_id", payload["judge_id"])
        .limit(1)
        .execute()
    )
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def _upsert_evaluation(supabase: Client, payload: Dict[str, Any]) -> None:
    existing = _fetch_existing_evaluation(supabase, payload)

    if not existing:
        supabase.table("evaluations").insert(payload, returning="minimal").execute()
        return

    tracked_fields = ("verdict", "reasoning", "reasoning_simhash")
    has_changes = any(payload.get(field) != existing.get(field) for field in tracked_fields)

    if not has_changes:
        return

    update_payload = {field: payload[field] for field in tracked_fields if field in payload}
    if payload.get("queue_id") and payload.get("queue_id") != existing.get("queue_id"):
        update_payload["queue_id"] = payload["queue_id"]

    update_payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("evaluations").update(update_payload).eq("id", existing["id"]).execute()

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