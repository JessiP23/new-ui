from typing import Optional
from fastapi import APIRouter, Query
from supabase import Client
from app.core.supabase import get_supabase_client
from app.core.config import get_settings
from app.services.evaluation_service import fetch_evaluations

router = APIRouter(prefix="/evaluations", tags=["evaluations"])

@router.get("")
def list_evaluations(
    queue_id: Optional[str] = Query(None),
    judge_id: Optional[str] = Query(None),
    question_id: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(None, ge=1, le=200),
):
    supabase: Client = get_supabase_client()
    settings = get_settings()
    judge_ids = judge_id.split(",") if judge_id else None
    question_ids = question_id.split(",") if question_id else None
    page_limit = limit or settings.evaluations_page_limit
    return fetch_evaluations(
        supabase,
        queue_id=queue_id,
        judge_ids=judge_ids,
        question_ids=question_ids,
        verdict=verdict,
        page=page,
        limit=page_limit,
    )