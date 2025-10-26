from typing import List, Optional
from fastapi import APIRouter, HTTPException
from supabase import Client
from app.models import Judge
from app.core.supabase import get_supabase_client
from app.services.judge_service import resolve_provider

router = APIRouter(prefix="/judges", tags=["judges"])

def _serialize_judge_payload(judge: Judge) -> dict:
    data = judge.dict(exclude_unset=True)
    data.pop("id", None)
    data.pop("provider", None)
    return data


def _with_provider(row: dict, provider: Optional[str]) -> dict:
    enriched = dict(row)
    resolved = resolve_provider(provider, row.get("model"))
    if resolved is not None:
        enriched["provider"] = resolved
    elif "provider" in enriched:
        enriched.pop("provider")
    return enriched

@router.get("")
def get_judges():
    supabase: Client = get_supabase_client()
    response = supabase.table("judges").select("*").execute()
    rows = response.data or []
    return [_with_provider(row, row.get("provider")) for row in rows]

@router.post("")
def create_judge(judge: Judge):
    supabase: Client = get_supabase_client()
    payload = _serialize_judge_payload(judge)
    provider = judge.provider
    try:
        response = supabase.table("judges").insert(payload).execute()
        data = response.data or []
        if not data:
            raise HTTPException(status_code=500, detail="Failed to create judge")
        return _with_provider(data[0], provider)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to create judge") from exc

@router.put("/{judge_id}")
def update_judge(judge_id: str, judge: Judge):
    supabase: Client = get_supabase_client()
    payload = _serialize_judge_payload(judge)
    provider = judge.provider
    try:
        response = supabase.table("judges").update(payload).eq("id", judge_id).execute()
        data = response.data or []
        if not data:
            raise HTTPException(status_code=404, detail="Judge not found")
        return _with_provider(data[0], provider)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to update judge") from exc

@router.delete("/{judge_id}")
def delete_judge(judge_id: str):
    supabase: Client = get_supabase_client()
    try:
        supabase.table("judges").delete().eq("id", judge_id).execute()
        return {"message": "Judge deleted"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to delete judge") from exc