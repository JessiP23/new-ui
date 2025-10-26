from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.core.config import get_settings
from app.core.supabase import get_supabase_client
from app.services.analytics_service import get_pass_rate_by_judge

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/pass_rate_by_judge")
def pass_rate_by_judge(
    queue_id: str = Query(..., description="Queue identifier"),
    from_ts: Optional[int] = Query(None, alias="from", description="Inclusive start timestamp (seconds since epoch)"),
    to_ts: Optional[int] = Query(None, alias="to", description="Inclusive end timestamp (seconds since epoch)"),
    interval: Optional[str] = Query(None, description="Aggregation interval: hour, day, week, or month"),
    limit: Optional[int] = Query(None, ge=1, le=50, description="Maximum number of judges to return"),
    supabase: Client = Depends(get_supabase_client),
):
    try:
        start = datetime.fromtimestamp(from_ts) if from_ts else None
        end = datetime.fromtimestamp(to_ts) if to_ts else None
    except (OSError, OverflowError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid timestamp") from exc

    settings = get_settings()
    limit_judges = limit if limit is not None else settings.analytics_top_judges

    try:
        payload = get_pass_rate_by_judge(
            supabase,
            queue_id,
            start,
            end,
            interval or settings.analytics_default_interval,
            limit_judges,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return payload