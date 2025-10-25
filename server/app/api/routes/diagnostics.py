import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from supabase import Client
from app.core.supabase import get_supabase_client
from app.services.analytics_service import get_dashboard_summary
from app.services.job_service import debug_queue, get_job_status, stream_live_status

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])

@router.get("/job_status")
def job_status(queue_id: str):
    supabase: Client = get_supabase_client()
    try:
        return get_job_status(supabase, queue_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch job status") from exc

@router.get("/summary")
def summary():
    supabase: Client = get_supabase_client()
    return get_dashboard_summary(supabase)

@router.get("/live_job_status")
def live_job_status(queue_id: str):
    supabase: Client = get_supabase_client()

    async def event_generator():
        async for payload in stream_live_status(supabase, queue_id):
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")