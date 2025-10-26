import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from supabase import Client
from app.core.config import Settings

def fetch_assignments(supabase: Client, queue_id: str) -> List[Dict[str, Any]]:
    response = supabase.table("assignments").select("*").eq("queue_id", queue_id).execute()
    rows = response.data or []
    return rows

def save_assignments(supabase: Client, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
    payload: List[Dict[str, Any]] = []
    queue_id: Optional[str] = None

    for assignment in assignments:
        data = dict(assignment)
        data.pop("id", None)
        data["judge_id"] = str(data["judge_id"])
        queue_id = queue_id or data.get("queue_id")
        payload.append(data)

    if not payload or not queue_id:
        raise HTTPException(status_code=400, detail="Assignments must include a queue_id")

    try:
        supabase.table("assignments").delete().eq("queue_id", queue_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to reset assignments for queue") from exc

    try:
        response = supabase.table("assignments").insert(payload).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to save assignments") from exc

    rows = response.data or []

    submissions_resp = (
        supabase.table("submissions").select("id", count="exact").eq("queue_id", queue_id).execute()
    )
    submissions_count = submissions_resp.count or 0
    assignments_count = len(payload)
    expected_evaluations = submissions_count * assignments_count

    summary = {
        "queue_id": queue_id,
        "assignment_set_id": str(uuid.uuid4()),
        "assignments_count": assignments_count,
        "submissions_count": submissions_count,
        "expected_evaluations": expected_evaluations,
    }

    return {"assignments": rows, "summary": summary}

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
    return result

def enqueue_judge_jobs(queue_id: str, supabase: Client, settings: Settings) -> Dict[str, Optional[int]]:
    assigns_resp = supabase.table("assignments").select("question_id, judge_id").eq("queue_id", queue_id).execute()
    assignments = assigns_resp.data or []
    if not assignments:
        return {"message": "No assignments found for queue", "enqueued": 0}

    total_enqueued = 0
    jobs_batch: List[Dict[str, Any]] = []
    offset = 0

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

    return {
        "message": "Jobs enqueued",
        "enqueued": total_enqueued,
        "expected_evaluations": total_enqueued,
        "job_id": queue_id,
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
        return len(jobs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to enqueue jobs") from exc

def _count_records(supabase: Client, table: str, queue_id: str) -> Optional[int]:
    try:
        response = supabase.table(table).select("id", count="exact").eq("queue_id", queue_id).execute()
        return response.count or 0
    except Exception:
        return None