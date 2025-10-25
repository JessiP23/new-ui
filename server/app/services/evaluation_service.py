from typing import Dict, Any, Optional
from fastapi import HTTPException
from supabase import Client

def fetch_evaluations(
    supabase: Client,
    queue_id: Optional[str] = None,
    judge_ids: Optional[list[str]] = None,
    question_ids: Optional[list[str]] = None,
    verdict: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
) -> Dict[str, Any]:
    query = supabase.table("evaluations").select("*", count="exact")

    if queue_id:
        subs = supabase.table("submissions").select("id").eq("queue_id", queue_id).execute()
        submission_ids = [s["id"] for s in subs.data or []]
        if not submission_ids:
            return {"evaluations": [], "total": 0}
        query = query.in_("submission_id", submission_ids)

    if judge_ids:
        query = query.in_("judge_id", judge_ids)

    if question_ids:
        query = query.in_("question_id", question_ids)

    if verdict:
        query = query.eq("verdict", verdict)

    offset = (page - 1) * limit
    response = query.range(offset, offset + limit - 1).execute()
    if response.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch evaluations")

    return {"evaluations": response.data, "total": response.count or 0}