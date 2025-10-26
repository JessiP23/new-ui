import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from supabase import Client
from app.models import Submission
from app.services.fingerprint_service import simhash
from app.core.supabase import get_supabase_client
from app.core.config import get_settings
from app.services.attachment_service import upload_submission_attachments, generate_attachment_metadata

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

    record = {
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

    if submission.attachments:
        record["attachments"] = [attachment.dict() for attachment in submission.attachments]
    return record

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

@router.post("/{submission_id}/attachments")
async def add_submission_attachments(
    submission_id: str,
    files: List[UploadFile] = File(...),
    supabase: Client = Depends(get_supabase_client),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    uploads = []
    for upload_file in files:
        result = await upload_submission_attachments(supabase, submission_id, upload_file)
        uploads.append(result)

    try:
        existing_resp = supabase.table("submissions").select("attachments").eq("id", submission_id).limit(1).execute()
        existing = (existing_resp.data or [{}])[0].get("attachments") or []
        meta_payload = existing + [generate_attachment_metadata(item) for item in uploads]
        supabase.table("submissions").update({"attachments": meta_payload}).eq("id", submission_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist attachment metadata") from exc

    return {"attachments": uploads}