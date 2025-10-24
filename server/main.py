import os
import json
import logging
import uuid
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import AsyncGroq
from openai import AsyncOpenAI
from app.models import Submission, Judge, Assignment
from app.services.judge_service import run_single_judge
from app.services.fingerprint_service import simhash, hamming_distance
import asyncio
import time
from datetime import datetime
from fastapi.responses import StreamingResponse
from types import SimpleNamespace

load_dotenv()
app = FastAPI()

UPLOAD_BATCH_SIZE = int(os.getenv("UPLOAD_BATCH_SIZE", "100"))
RUN_JUDGES_PER_PAGE = 1000
JOB_BATCH_SIZE = 500
EVALUATIONS_PAGE_LIMIT = 50

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY")) 
groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY")) if AsyncOpenAI and os.getenv("OPENAI_API_KEY") else None

@app.get("/")
def root():
    return {"message": "AI Judge backend running!"}

@app.post("/upload")
async def upload_submissions(data: List[dict]):
    if not data or not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Must provide valid JSON array")

    total = 0
    batch = []

    def build_record(item: dict):
        submission = Submission(**item)
        answers = submission.answers or {}
        parts = []
        for k, v in answers.items():
            if isinstance(v, dict):
                parts.append(str(v.get('choice', '')))
                parts.append(str(v.get('reasoning', '')))
            else:
                parts.append(str(v))
        answer_text = " ".join(parts)

        sh = None
        bucket = None
        try:
            sh = simhash(answer_text)
            if isinstance(sh, int):
                mask64 = (1 << 64) - 1
                unsigned_sh = sh & mask64
                bucket = (unsigned_sh >> (64 - 16)) & 0xFFFF
        except Exception:
            print("simhash compute failed for submission %s", submission.id)

        return {
            'id': submission.id,
            'queue_id': submission.queueId,
            'labeling_task_id': submission.labelingTaskId,
            'created_at': submission.createdAt,
            'data': json.dumps({
                'questions': [q.dict() for q in submission.questions],
                'answers': {k: v for k, v in submission.answers.items()}
            }),
            'answer_simhash': sh,
            'simhash_bucket': bucket
        }

    for item in data:
        batch.append(build_record(item))
        if len(batch) >= UPLOAD_BATCH_SIZE:
            try:
                resp = supabase.table('submissions').upsert(batch, on_conflict='id').execute()
                uploaded = len(batch)
                total += uploaded
                print('Uploaded batch of %s submissions', uploaded)
                batch = []
            except Exception as e:
                print("Failed batch upsert submissions: %s", str(e))
                raise HTTPException(status_code=500, detail="Failed to upload submissions (batch)")

    if batch:
        try:
            resp = supabase.table('submissions').upsert(batch, on_conflict='id').execute()
            uploaded = len(batch)
            total += uploaded
            print('Uploaded final batch of %s submissions', uploaded)
        except Exception as e:
            print("Failed final batch upsert submissions: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to upload submissions (final batch)")

    return {"message": f"Uploaded {total} submissions"}

@app.get("/judges")
def get_judges():
    response = supabase.table('judges').select('*').execute()
    return response.data

@app.post("/judges")
def create_judge(judge: Judge):
    data = judge.dict(exclude_unset=True)
    data.pop('id', None)
    response = supabase.table('judges').insert(data).execute()
    return response.data[0]

@app.put("/judges/{judge_id}")
def update_judge(judge_id: str, judge: Judge):
    data = judge.dict(exclude_unset=True)
    data.pop('id', None)
    response = supabase.table('judges').update(data).eq('id', judge_id).execute()
    return response.data[0]

@app.delete("/judges/{judge_id}")
def delete_judge(judge_id: str):
    supabase.table('judges').delete().eq('id', judge_id).execute()
    return {"message": "Judge deleted"}

@app.post("/assignments")
def create_assignments(assignments: List[Assignment]):
    data = [a.dict(exclude_unset=True) for a in assignments]
    for d in data:
        d.pop('id', None)
        d['judge_id'] = str(d['judge_id'])
    response = supabase.table('assignments').insert(data).execute()
    return response.data

@app.get("/assignments")
def get_assignments(queue_id: str):
    response = supabase.table('assignments').select('*, judges(name)').eq('queue_id', queue_id).execute()
    return response.data

@app.post("/run_judges")
async def run_judges(queue_id: str):
    assigns_resp = supabase.table('assignments').select('question_id, judge_id').eq('queue_id', queue_id).execute()
    assigns = assigns_resp.data or []
    print('run_judges called for queue=%s assigns=%s', queue_id, len(assigns))
    if not assigns:
        print('No assignments found for queue %s', queue_id)
        return {"message": "No assignments found for queue", "enqueued": 0}

    total_enqueued = 0
    jobs_batch = []
    offset = 0

    while True:
        subs_resp = supabase.table('submissions').select('id,data').eq('queue_id', queue_id).range(offset, offset + RUN_JUDGES_PER_PAGE - 1).execute()
        rows = subs_resp.data or []
        print('run_judges: fetched %s submissions at offset %s for queue %s', len(rows), offset, queue_id)
        if not rows:
            break

        for row in rows:
            sub_id = row['id']
            try:
                sub_data = json.loads(row['data'])
            except Exception:
                continue
            for assign in assigns:
                qid = assign['question_id']
                has_q = False
                if isinstance(sub_data, dict):
                    if qid in (sub_data.get('answers') or {}):
                        has_q = True
                    else:
                        for q in sub_data.get('questions', []):
                            qdata = q.get('data') if isinstance(q, dict) and 'data' in q else q
                            if qdata and qdata.get('id') == qid:
                                has_q = True
                                break
                if not has_q:
                    continue

                job = {
                    "id": str(uuid.uuid4()),
                    "submission_id": sub_id,
                    "submission_data": sub_data,
                    "question_id": qid,
                    "judge_id": str(assign['judge_id']),
                    "queue_id": queue_id,
                    "status": "pending",
                    "attempts": 0,
                    "created_at": datetime.utcnow().isoformat()
                }
                jobs_batch.append(job)
                if len(jobs_batch) >= JOB_BATCH_SIZE:
                    try:
                        resp = supabase.table('judge_jobs').insert(jobs_batch).execute()
                        enq = len(jobs_batch)
                        total_enqueued += enq
                        print('Enqueued batch of %s jobs for queue %s', enq, queue_id)
                        jobs_batch = []
                    except Exception as e:
                        print("Failed inserting job batch: %s", str(e))
                        raise HTTPException(status_code=500, detail="Failed to enqueue jobs (batch)")

        offset += RUN_JUDGES_PER_PAGE

    if jobs_batch:
        try:
            resp = supabase.table('judge_jobs').insert(jobs_batch).execute()
            enq = len(jobs_batch)
            total_enqueued += enq
            print('Enqueued final batch of %s jobs for queue %s', enq, queue_id)
        except Exception as e:
            print("Failed inserting final job batch: %s", str(e))
            raise HTTPException(status_code=500, detail="Failed to enqueue jobs (final batch)")

    try:
        subs_count = supabase.table('submissions').select('id', count='exact').eq('queue_id', queue_id).execute().count or 0
    except Exception:
        subs_count = None
    try:
        assigns_count = supabase.table('assignments').select('id', count='exact').eq('queue_id', queue_id).execute().count or 0
    except Exception:
        assigns_count = None

    return {"message": "Jobs enqueued", "enqueued": total_enqueued, "submissions_count": subs_count, "assignments_count": assigns_count}

@app.get("/evaluations")
def get_evaluations(queue_id: str = None, judge_id: str = None, question_id: str = None, verdict: str = None, page: int = 1, limit: int = EVALUATIONS_PAGE_LIMIT):
    try:
        query = supabase.table('evaluations').select('*', count='exact')
        if queue_id:
            subs = supabase.table('submissions').select('id').eq('queue_id', queue_id).execute()
            submission_ids = [s['id'] for s in subs.data]
            if not submission_ids:
                return {"evaluations": [], "total": 0}
            query = query.in_('submission_id', submission_ids)
        if judge_id:
            judge_ids = judge_id.split(',') if ',' in judge_id else [judge_id]
            query = query.in_('judge_id', judge_ids)
        if question_id:
            question_ids = question_id.split(',') if ',' in question_id else [question_id]
            query = query.in_('question_id', question_ids)
        if verdict:
            query = query.eq('verdict', verdict)
        
        offset = (page - 1) * limit
        response = query.range(offset, offset + limit - 1).execute()
        return {"evaluations": response.data, "total": response.count}
    except Exception as e:
        print("Error fetching evaluations: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch evaluations")

@app.get("/questions")
def get_questions(queue_id: str):
    subs = supabase.table('submissions').select('data').eq('queue_id', queue_id).execute()
    questions = set()
    for sub in subs.data:
        data = json.loads(sub['data'])
        for q in data['questions']:
            questions.add(q['data']['id'])
    return list(questions)


@app.get("/job_status")
def get_job_status(queue_id: str):
    try:
        statuses = ["pending", "running", "done", "failed"]
        counts = {}
        for s in statuses:
            resp = supabase.table('judge_jobs').select('id', count='exact').eq('queue_id', queue_id).eq('status', s).execute()
            counts[s] = resp.count or 0

        total_resp = supabase.table('judge_jobs').select('id', count='exact').eq('queue_id', queue_id).execute()
        total = total_resp.count or 0
        return {"counts": counts, "total": total}
    except Exception as e:
        print("Error fetching job status: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch job status")


@app.get("/debug_queue")
def debug_queue(queue_id: str):
    try:
        subs_resp = supabase.table('submissions').select('id', count='exact').eq('queue_id', queue_id).execute()
        assigns_resp = supabase.table('assignments').select('id', count='exact').eq('queue_id', queue_id).execute()
        jobs_resp = supabase.table('judge_jobs').select('id', count='exact').eq('queue_id', queue_id).execute()
        return {
            'submissions': subs_resp.count or 0,
            'assignments': assigns_resp.count or 0,
            'judge_jobs': jobs_resp.count or 0,
        }
    except Exception as e:
        print('Error in debug_queue: %s', str(e))
        raise HTTPException(status_code=500, detail='Failed to fetch debug info')


@app.get("/peek_submissions")
def peek_submissions(queue_id: str, limit: int = 20):
    try:
        resp = supabase.table('submissions').select('id,data').eq('queue_id', queue_id).limit(limit).execute()
        return {"rows": resp.data or []}
    except Exception as e:
        print('peek_submissions error: %s', str(e))
        raise HTTPException(status_code=500, detail='Failed to peek submissions')


@app.get("/peek_assignments")
def peek_assignments(queue_id: str, limit: int = 50):
    try:
        resp = supabase.table('assignments').select('*').eq('queue_id', queue_id).limit(limit).execute()
        return {"rows": resp.data or []}
    except Exception as e:
        print('peek_assignments error: %s', str(e))
        raise HTTPException(status_code=500, detail='Failed to peek assignments')


@app.get("/live_job_status")
def live_job_status(queue_id: str):
    async def event_generator():
        try:
            while True:
                try:
                    statuses = ["pending", "running", "done", "failed"]
                    counts = {}
                    for s in statuses:
                        resp = supabase.table('judge_jobs').select('id', count='exact').eq('queue_id', queue_id).eq('status', s).execute()
                        counts[s] = resp.count or 0

                    total_resp = supabase.table('judge_jobs').select('id', count='exact').eq('queue_id', queue_id).execute()
                    total = total_resp.count or 0
                    payload = {"counts": counts, "total": total}
                    yield f"data: {json.dumps(payload)}\n\n"

                    if (counts.get('pending', 0) + counts.get('running', 0)) == 0 and total > 0:
                        break

                except Exception:
                    print('Error inside live_job_status generator')
                await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            print('SSE client disconnected')

    return StreamingResponse(event_generator(), media_type='text/event-stream')
