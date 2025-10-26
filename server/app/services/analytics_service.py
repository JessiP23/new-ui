from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple
from supabase import Client
from app.core.config import get_settings
def _count_evaluations_for_queue(supabase: Client, queue_id: str) -> int:
    try:
        resp = supabase.table("evaluations").select("id", count="exact").eq("queue_id", queue_id).limit(1).execute()
        return resp.count or 0
    except Exception:
        return 0


def list_recent_queues(supabase: Client, limit: int = 15) -> List[Dict[str, Any]]:
    seen = set()
    queues: List[Dict[str, Any]] = []
    try:
        response = (
            supabase.table("submissions")
            .select("queue_id, created_at")
            .order("created_at", desc=True)
            .limit(250)
            .execute()
        )
    except Exception:
        return []

    for row in response.data or []:
        queue_id = row.get("queue_id")
        if not queue_id or queue_id in seen:
            continue
        seen.add(queue_id)
        queues.append(
            {
                "queue_id": queue_id,
                "created_at": row.get("created_at"),
                "evaluation_count": _count_evaluations_for_queue(supabase, queue_id),
            }
        )
        if len(queues) >= limit:
            break

    return queues


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

def get_pass_rate_by_judge(
    supabase: Client,
    queue_id: str,
    start: Optional[datetime],
    end: Optional[datetime],
    interval: str,
    limit_judges: Optional[int] = None,
) -> Dict[str, Any]:
    if not queue_id:
        raise ValueError("queue_id is required")

    settings = get_settings()
    interval_key = interval or settings.analytics_default_interval
    allowed = {"hour", "day", "week", "month"}
    if interval_key not in allowed:
        interval_key = "day"

    rows = _fetch_evaluations(supabase, queue_id, start, end)
    judge_names = _load_judge_names(supabase)

    totals, per_judge = _aggregate_pass_rates(rows, interval_key)

    timeline_buckets: Dict[int, Dict[str, int]] = defaultdict(
        lambda: {"pass": 0, "fail": 0, "inconclusive": 0, "total": 0}
    )

    for buckets in per_judge.values():
        for bucket_ts, counts in buckets.items():
            aggregate = timeline_buckets[bucket_ts]
            aggregate["pass"] += counts["pass"]
            aggregate["fail"] += counts["fail"]
            aggregate["inconclusive"] += counts["inconclusive"]
            aggregate["total"] += counts["total"]

    ranked = sorted(
        per_judge.items(),
        key=lambda item: sum(point[1]["total"] for point in item[1].items()),
        reverse=True,
    )
    if limit_judges is None:
        limit_judges = settings.analytics_top_judges
    limited = ranked[: limit_judges or len(ranked)]

    series: List[Dict[str, Any]] = []
    rankings: List[Dict[str, Any]] = []
    for judge_id, buckets in limited:
        name = judge_names.get(judge_id, judge_id)
        running_pass = 0
        running_fail = 0
        running_inconclusive = 0
        running_total = 0
        points: List[Dict[str, Any]] = []

        for bucket_ts, counts in sorted(buckets.items()):
            bucket_total = counts["total"]
            bucket_pass = counts["pass"]
            running_total += bucket_total
            running_pass += bucket_pass
            running_fail += counts["fail"]
            running_inconclusive += counts["inconclusive"]

            bucket_pass_rate = round((bucket_pass / bucket_total) * 100, 1) if bucket_total else 0.0
            cumulative_pass_rate = round((running_pass / running_total) * 100, 1) if running_total else 0.0

            points.append(
                {
                    "ts": bucket_ts,
                    "pass": bucket_pass,
                    "fail": counts["fail"],
                    "inconclusive": counts["inconclusive"],
                    "total": bucket_total,
                    "pass_rate": bucket_pass_rate,
                    "cumulative_pass_rate": cumulative_pass_rate,
                    "cumulative_total": running_total,
                }
            )

        judge_totals = {
            "pass": running_pass,
            "fail": running_fail,
            "inconclusive": running_inconclusive,
            "total": running_total,
            "pass_rate": round((running_pass / running_total) * 100, 1) if running_total else 0.0,
        }

        rankings.append(
            {
                "judge_id": judge_id,
                "judge_name": name,
                "total": judge_totals["total"],
                "pass_rate": judge_totals["pass_rate"],
            }
        )

        series.append(
            {
                "judge_id": judge_id,
                "judge_name": name,
                "totals": judge_totals,
                "points": points,
            }
        )

    total_evals = totals.get("total", 0)
    pass_count = totals.get("pass", 0)
    overall_pass_rate = round((pass_count / total_evals) * 100, 1) if total_evals else 0.0

    meta = {
        "queue_id": queue_id,
        "from": int(start.timestamp()) if start else None,
        "to": int(end.timestamp()) if end else None,
        "interval": interval_key,
        "judges": len(series),
    }

    rankings = sorted(rankings, key=lambda item: (item["total"], item["pass_rate"]), reverse=True)

    timeline_points: List[Dict[str, Any]] = []
    cumulative_pass = 0
    cumulative_total = 0
    for bucket_ts, counts in sorted(timeline_buckets.items()):
        cumulative_pass += counts["pass"]
        cumulative_total += counts["total"]
        timeline_points.append(
            {
                "ts": bucket_ts,
                "pass": counts["pass"],
                "fail": counts["fail"],
                "inconclusive": counts["inconclusive"],
                "total": counts["total"],
                "pass_rate": round((counts["pass"] / counts["total"]) * 100, 1) if counts["total"] else 0.0,
                "cumulative_pass_rate": round((cumulative_pass / cumulative_total) * 100, 1)
                if cumulative_total
                else 0.0,
                "cumulative_total": cumulative_total,
            }
        )

    return {
        "meta": meta,
        "series": series,
        "totals": {
            "total_evals": total_evals,
            "pass_count": pass_count,
            "pass_rate": overall_pass_rate,
        },
        "rankings": rankings,
        "timeline": timeline_points,
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

def _fetch_evaluations(
    supabase: Client,
    queue_id: str,
    start: Optional[datetime],
    end: Optional[datetime],
) -> Iterable[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    page_size = 1000
    offset = 0
    while True:
        query = supabase.table("evaluations").select("judge_id, verdict, created_at, queue_id").eq("queue_id", queue_id)
        if start:
            query = query.gte("created_at", start.isoformat())
        if end:
            query = query.lte("created_at", end.isoformat())
        response = query.range(offset, offset + page_size - 1).execute()
        chunk = response.data or []
        results.extend(chunk)
        if len(chunk) < page_size:
            break
        offset += page_size
    return results

def _truncate_to_bucket(dt: datetime, interval: str) -> datetime:
    if interval == "hour":
        return dt.replace(minute=0, second=0, microsecond=0)
    if interval == "week":
        start = dt - timedelta(days=dt.weekday())
        return start.replace(hour=0, minute=0, second=0, microsecond=0)
    if interval == "month":
        return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)

def _aggregate_pass_rates(rows: Iterable[Dict[str, Any]], interval: str) -> Tuple[Dict[str, int], Dict[str, Dict[int, Dict[str, int]]]]:
    totals = {"total": 0, "pass": 0, "fail": 0, "inconclusive": 0}
    per_judge: Dict[str, Dict[int, Dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: {"pass": 0, "fail": 0, "inconclusive": 0, "total": 0})
    )

    for row in rows:
        judge_id = row.get("judge_id")
        verdict = row.get("verdict")
        created_at = row.get("created_at")
        if not judge_id or not verdict or not created_at:
            continue
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except ValueError:
            dt = datetime.now(timezone.utc)
        bucket = _truncate_to_bucket(dt, interval)
        bucket_ts = int(bucket.replace(tzinfo=timezone.utc).timestamp())
        counts = per_judge[judge_id][bucket_ts]
        counts["total"] += 1
        if verdict in counts:
            counts[verdict] += 1
        totals["total"] += 1
        totals[verdict] = totals.get(verdict, 0) + 1

    return totals, per_judge

def _load_judge_names(supabase: Client) -> Dict[str, str]:
    try:
        response = supabase.table("judges").select("id, name").execute()
    except Exception:
        return {}
    data = response.data or []
    return {item["id"]: item.get("name", item["id"]) for item in data}