import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from supabase import Client

from app.core.config import Settings

logger = logging.getLogger(__name__)

def fetch_assignments(supabase: Client, queue_id: str) -> List[Dict[str, Any]]:
    response = supabase.table("assignments").select("*").eq("queue_id", queue_id).execute()
    rows = response.data or []
    logger.info("queue.fetch_assignments", extra={"queue_id": queue_id, "count": len(rows)})
    return rows

def save_assignments(supabase: Client, assignments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    payload = []
    for assignment in assignments:
        data = dict(assignment)
        data.pop("id", None)
        data["judge_id"] = str(data["judge_id"])
        payload.append(data)
    response = supabase.table("assignments").insert(payload).execute()
    rows = response.data or []
    logger.info(
        "queue.save_assignments",
        extra={"queue_id": payload[0]["queue_id"] if payload else None, "inserted": len(payload)},
    )
    return rows

def list_questions(supabase: Client, queue_id: str) -> List[str]:
    subs = supabase.table("submissions").select("data").eq("queue_id", queue_id).execute()
    questions = set()
    for sub in subs.data or []:
        try:
            data = json.loads(sub.get("data") or "{}")
        except json.JSONDecodeError:
            continue
        for q in data.get("questions", []):
            qdata = q.get("data") if isinstance(q, dict) else q
            if isinstance(qdata, dict) and "id" in qdata:
                questions.add(qdata["id"])
    result = sorted(list(questions))
    logger.info("queue.list_questions", extra={"queue_id": queue_id, "count": len(result)})
    return result

def enqueue_judge_jobs(queue_id: str, supabase: Client, settings: Settings) -> Dict[str, Optional[int]]:
    assigns_resp = supabase.table("assignments").select("question_id, judge_id").eq("queue_id", queue_id).execute()
    assignments = assigns_resp.data or []
    if not assignments:
        logger.warning("queue.enqueue_judge_jobs.no_assignments", extra={"queue_id": queue_id})
        return {"message": "No assignments found for queue", "enqueued": 0}

    total_enqueued = 0
    jobs_batch: List[Dict[str, Any]] = []
    offset = 0

    logger.info(
        "queue.enqueue_judge_jobs.start",
        extra={
            "queue_id": queue_id,
            "assignments": len(assignments),
            "run_page_size": settings.run_judges_page,
            "job_batch_size": settings.job_batch_size,
        },
    )

    while True:
        subs_resp = (
            supabase.table("submissions")
            .select("id,data")
            .eq("queue_id", queue_id)
            .range(offset, offset + settings.run_judges_page - 1)
            .execute()
        )
        rows = subs_resp.data or []
        if not rows:
            break

        for row in rows:
            sub_id = row["id"]
            try:
                sub_data = json.loads(row.get("data") or "{}")
            except Exception:
                logger.exception(
                    "queue.enqueue_judge_jobs.parse_error",
                    extra={"queue_id": queue_id, "submission_id": sub_id},
                )
                continue
            for assign in assignments:
                qid = assign["question_id"]
                if not _submission_contains_question(sub_data, qid):
                    continue
                job = _build_job(sub_id, sub_data, qid, str(assign["judge_id"]), queue_id)
                jobs_batch.append(job)
                if len(jobs_batch) >= settings.job_batch_size:
                    total_enqueued += _flush_jobs(supabase, jobs_batch)
                    jobs_batch = []

        offset += settings.run_judges_page

    if jobs_batch:
        total_enqueued += _flush_jobs(supabase, jobs_batch)

    logger.info(
        "queue.enqueue_judge_jobs.finish",
        extra={
            "queue_id": queue_id,
            "enqueued": total_enqueued,
            "submissions": _count_records(supabase, "submissions", queue_id),
            "assignments": _count_records(supabase, "assignments", queue_id),
        },
    )

    return {
        "message": "Jobs enqueued",
        "enqueued": total_enqueued,
        "submissions_count": _count_records(supabase, "submissions", queue_id),
        "assignments_count": _count_records(supabase, "assignments", queue_id),
    }

def _submission_contains_question(sub_data: Dict[str, Any], question_id: str) -> bool:
    answers = sub_data.get("answers") or {}
    if question_id in answers:
        return True
    for question in sub_data.get("questions", []):
        qdata = question.get("data") if isinstance(question, dict) else question
        if isinstance(qdata, dict) and qdata.get("id") == question_id:
            return True
    return False

def _build_job(submission_id: str, submission_data: Dict[str, Any], question_id: str, judge_id: str, queue_id: str) -> Dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "submission_id": submission_id,
        "submission_data": submission_data,
        "question_id": question_id,
        "judge_id": judge_id,
        "queue_id": queue_id,
        "status": "pending",
        "attempts": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

def _flush_jobs(supabase: Client, jobs: List[Dict[str, Any]]) -> int:
    if not jobs:
        return 0
    try:
        supabase.table("judge_jobs").insert(jobs).execute()
        logger.info(
            "queue.enqueue_judge_jobs.flush",
            extra={"count": len(jobs), "queue_id": jobs[0].get("queue_id") if jobs else None},
        )
        return len(jobs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to enqueue jobs") from exc

def _count_records(supabase: Client, table: str, queue_id: str) -> Optional[int]:
    try:
        response = supabase.table(table).select("id", count="exact").eq("queue_id", queue_id).execute()
        return response.count or 0
    except Exception:
        return None