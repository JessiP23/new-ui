import uuid
from typing import Any, Dict
from fastapi import HTTPException, UploadFile
from supabase import Client
from app.core.config import get_settings

async def upload_submission_attachments(supabase: Client, submission_id: str, upload_file: UploadFile) -> Dict[str, Any]:
    settings = get_settings()
    bucket = getattr(settings, "attachments_bucket", "attachments")
    ttl = getattr(settings, "attachments_signed_ttl", 3600)

    path = f"{submission_id}/{uuid.uuid4().hex}_{upload_file.filename}"
    try:
        file_bytes = await upload_file.read()
        storage = supabase.storage.from_(bucket)
        storage.upload(path, file_bytes, {"upsert": True, "content-type": upload_file.content_type or "application/octet-stream"})
        signed = storage.create_signed_url(path, ttl)
    except Exception as exc: 
        raise HTTPException(status_code=500, detail="Failed to store attachment") from exc

    return {
        "id": uuid.uuid4().hex,
        "path": path,
        "filename": upload_file.filename,
        "content_type": upload_file.content_type,
        "url": signed.get("signedURL") if isinstance(signed, dict) else signed,
    }

def generate_attachment_metadata(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": item.get("id"),
        "filename": item.get("filename"),
        "url": item.get("url"),
        "content_type": item.get("content_type"),
    }