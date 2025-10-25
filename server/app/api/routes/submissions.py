import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from supabase import Client
from app.models import Submission
from app.services.fingerprint_service import simhash
from app.core.supabase import get_supabase_client
from app.core.config import get_settings

router = APIRouter(prefix="/submissions", tags=["submissions"])

def _build_submission_record(item: dict) -> dict:
    submission = Submission(**item)
    answers = submission.answers or {}
    parts: List[str] = []
    for value in answers.values():
        if isinstance(value, dict):
            parts.append(str(value.get("choice", "")))
            parts.append(str(value.get("reasoning", "")))
        else:
            parts.append(str(value))
    answer_text = " ".join(parts)

    sh = None
    bucket = None
    try:
        sh = simhash(answer_text)
        if isinstance(sh, int):
            mask64 = (1 << 64) - 1
            unsigned_sh = sh & mask64
            bucket = (unsigned_sh >> (64 - 16)) & 0xFFFF
    except Exception:
        pass

    return {
        "id": submission.id,
        "queue_id": submission.queueId,
        "labeling_task_id": submission.labelingTaskId,
        "created_at": submission.createdAt,
        "data": json.dumps(
            {
                "questions": [q.dict() for q in submission.questions],
                "answers": {k: v for k, v in submission.answers.items()},
            }
        ),
        "answer_simhash": sh,
        "simhash_bucket": bucket,
    }

@router.post("")
async def upload_submissions(data: List[dict]):
    if not data or not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Must provide valid JSON array")

    supabase: Client = get_supabase_client()
    settings = get_settings()

    total = 0
    batch: List[dict] = []

    for item in data:
        batch.append(_build_submission_record(item))
        if len(batch) >= settings.upload_batch_size:
            try:
                supabase.table("submissions").upsert(batch, on_conflict="id").execute()
                total += len(batch)
                batch = []
            except Exception as exc:
                raise HTTPException(status_code=500, detail="Failed to upload submissions (batch)") from exc

    if batch:
        try:
            supabase.table("submissions").upsert(batch, on_conflict="id").execute()
            total += len(batch)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to upload submissions (final batch)") from exc

    return {"message": f"Uploaded {total} submissions"}
    
@router.post("/upload", include_in_schema=False)
async def legacy_upload(data: List[dict]):
    return await upload_submissions(data)