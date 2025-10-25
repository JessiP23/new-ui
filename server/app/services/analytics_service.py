from typing import Any, Dict
from supabase import Client

def get_dashboard_summary(supabase: Client) -> Dict[str, Any]:
    submissions_count = _count_table(supabase, "submissions")
    judges_count = _count_table(supabase, "judges")
    evaluations_total = _count_table(supabase, "evaluations")
    passes = _count_table(supabase, "evaluations", filters={"verdict": "pass"})
    pass_rate = 0.0
    if evaluations_total:
        pass_rate = round((passes / evaluations_total) * 100, 1)

    queues_total = _count_table(supabase, "judge_jobs")

    return {
        "submissions": submissions_count,
        "judges": judges_count,
        "evaluations": evaluations_total,
        "pass_rate": pass_rate,
        "jobs": queues_total,
    }

def _count_table(supabase: Client, table: str, filters: Dict[str, Any] | None = None) -> int:
    query = supabase.table(table).select("id", count="exact")
    if filters:
        for key, value in filters.items():
            query = query.eq(key, value)
    try:
        response = query.execute()
        return response.count or 0
    except Exception:
        return 0