from typing import List, Dict
from fastapi import APIRouter, HTTPException
from supabase import Client
from app.models import Assignment
from app.core.supabase import get_supabase_client
from app.core.config import get_settings
from app.services.queue_service import (
    fetch_assignments,
    save_assignments,
    list_questions,
    enqueue_judge_jobs,
)

router = APIRouter(prefix="/queue", tags=["queue"])

@router.get("/questions")
def get_questions(queue_id: str):
    supabase: Client = get_supabase_client()
    return list_questions(supabase, queue_id)

@router.get("/assignments")
def get_assignments(queue_id: str):
    supabase: Client = get_supabase_client()
    return fetch_assignments(supabase, queue_id)

@router.post("/assignments")
def create_assignments(assignments: List[Assignment]):
    supabase: Client = get_supabase_client()
    payload: List[Dict] = [assignment.dict(exclude_unset=True) for assignment in assignments]
    if not payload:
        raise HTTPException(status_code=400, detail="No assignments provided")
    return save_assignments(supabase, payload)

@router.post("/run")
async def run_queue(queue_id: str):
    supabase: Client = get_supabase_client()
    settings = get_settings()
    return enqueue_judge_jobs(queue_id, supabase, settings)