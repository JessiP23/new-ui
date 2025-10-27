from typing import Dict, Any, Optional
from fastapi import HTTPException
from supabase import Client

def _apply_filters(query, submission_ids, judge_ids, question_ids, verdict):
    if submission_ids is not None:
        query = query.in_("submission_id", submission_ids)
    if judge_ids:
        query = query.in_("judge_id", judge_ids)
    if question_ids:
        query = query.in_("question_id", question_ids)
    if verdict:
        query = query.eq("verdict", verdict)
    return query

def fetch_evaluations(
    supabase: Client,
    queue_id: Optional[str] = None,
    judge_ids: Optional[list[str]] = None,
    question_ids: Optional[list[str]] = None,
    verdict: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
) -> Dict[str, Any]:
    submission_ids: Optional[list[str]] = None
    if queue_id:
        subs = supabase.table("submissions").select("id").eq("queue_id", queue_id).execute()
        submission_ids = [s["id"] for s in subs.data or []]
        if not submission_ids:
            return {"evaluations": [], "total": 0, "pass_count": 0, "pass_rate": 0.0}

    query = supabase.table("evaluations").select("*", count="exact")
    query = _apply_filters(query, submission_ids, judge_ids, question_ids, verdict) 

    offset = (page - 1) * limit
    response = query.range(offset, offset + limit - 1).execute()
    if response.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch evaluations")

    total = response.count or 0
    if verdict and verdict != "pass":
        pass_count = 0
    elif verdict == "pass":
        pass_count = total
    else:
        pass_query = supabase.table("evaluations").select("id", count="exact")
        pass_query = _apply_filters(pass_query, submission_ids, judge_ids, question_ids, verdict=None)
        pass_response = pass_query.eq("verdict", "pass").execute()
        pass_count = pass_response.count or 0
    pass_rate = round((pass_count / total) * 100, 1) if total else 0.0

    rows = response.data or []

    judge_ids = sorted({r.get("judge_id") for r in rows if r.get("judge_id")})
    judge_map: Dict[str, str] = {}
    if judge_ids:
        try:
            jresp = supabase.table("judges").select("id, name").in_("id", judge_ids).execute()
            for j in jresp.data or []:
                judge_map[str(j.get("id"))] = j.get("name")
        except Exception:
            judge_map = {}

    enriched = []
    for r in rows:
        jr = dict(r)
        jid = jr.get("judge_id")
        if jid and jid in judge_map:
            jr.setdefault("judges", {}).update({"name": judge_map[jid]})
        enriched.append(jr)

    return {
        "evaluations": enriched,
        "total": total,
        "pass_count": pass_count,
        "pass_rate": pass_rate,
    }