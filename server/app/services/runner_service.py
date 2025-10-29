from datetime import datetime, timezone
from typing import Any, Dict, Optional
from supabase import Client
from app.services.judge_service import run_single_judge, PROMPT_TEMPLATE, _extract_question, _parse_verdict
from ..core.dedalus_client import DedalusClient
from app.services.fingerprint_service import simhash

async def run_ai_judge_job(
    job: Dict[str, Any],
    judges_map: Dict[str, Dict[str, Any]],
    supabase: Client,
    provider_clients: Dict[str, Any],
):
    job_id = job["id"]
    try:
        judge = judges_map.get(str(job.get("judge_id"))) if judges_map else None
        evaluation = None
        if judge and (str(judge.get("provider", "")).lower() == "dedalus" or judge.get("use_dedalus")):
            submission_data = job.get("submission_data") or {}
            question = _extract_question(submission_data, job.get("question_id"))
            if question:
                answer = submission_data.get("answers", {}).get(job.get("question_id"))
                if answer:
                    answer_text = ' '.join(str(value) for value in answer.values())
                    prompt = PROMPT_TEMPLATE.format(
                        system_prompt=judge.get('system_prompt', ''),
                        question_text=question.get('questionText') or question.get('question_text') or question.get('text') or str(question),
                        answer_text=answer_text,
                    )
                    dedalus = DedalusClient()
                    try:
                        response = await dedalus.run_agent(input_text=prompt, model=judge.get('model'))
                        raw = None
                        if response is None:
                            raw = None
                        else:
                            raw = getattr(response, 'final_output', None) or getattr(response, 'output', None) or str(response)
                        if raw:
                            verdict, reasoning = _parse_verdict(raw)
                            reasoning = reasoning[:1000]
                            evaluation = {
                                'submission_id': job['submission_id'],
                                'question_id': job['question_id'],
                                'judge_id': str(job['judge_id']),
                                'verdict': verdict,
                                'reasoning': reasoning,
                                'reasoning_simhash': simhash(reasoning),
                                'created_at': datetime.now(timezone.utc).isoformat(),
                            }
                    except Exception as exc:
                        raise
        else:
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
    identity = {
        "submission_id": payload["submission_id"],
        "question_id": payload["question_id"],
        "judge_id": payload["judge_id"],
    }

    existing = _fetch_existing_evaluation(supabase, identity)
    timestamp = datetime.now(timezone.utc).isoformat()

    if not existing:
        insert_payload: Dict[str, Any] = {**payload, **identity}
        insert_payload.setdefault("created_at", timestamp)
        if payload.get("queue_id") is not None:
            insert_payload["queue_id"] = payload["queue_id"]
        supabase.table("evaluations").upsert(
            insert_payload,
            on_conflict="submission_id,question_id,judge_id",
        ).execute()
        return

    tracked_fields = ("verdict", "reasoning", "reasoning_simhash")
    changes: Dict[str, Any] = {
        field: payload[field]
        for field in tracked_fields
        if field in payload and payload[field] != existing.get(field)
    }

    queue_id = payload.get("queue_id")
    if queue_id and queue_id != existing.get("queue_id"):
        changes["queue_id"] = queue_id

    if not changes:
        return

    update_payload: Dict[str, Any] = {**identity, **changes, "updated_at": timestamp}
    supabase.table("evaluations").upsert(
        update_payload,
        on_conflict="submission_id,question_id,judge_id",
    ).execute()

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