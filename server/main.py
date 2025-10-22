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
from app.models import Submission, Judge, Assignment
from app.services.judge_service import run_single_judge
from app.services.fingerprint_service import simhash, hamming_distance
import asyncio

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

@app.get("/")
def root():
    return {"message": "AI Judge backend running!"}

@app.post("/upload")
async def upload_submissions(data: List[dict]):
    if not data or not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Must provide valid JSON array")

    for item in data:
        submission = Submission(**item)
        record = {
            'id': submission.id,
            'queue_id': submission.queueId,
            'labeling_task_id': submission.labelingTaskId,
            'created_at': submission.createdAt,
            'data': json.dumps({
                'questions': [q.dict() for q in submission.questions],
                'answers': {k: v for k, v in submission.answers.items()}
            })
        }
        try:
            supabase.table('submissions').insert(record).execute()
        except Exception as e:
            msg = str(e)
            if 'duplicate key' in msg or 'already exists' in msg or '23505' in msg:
                try:
                    supabase.table('submissions').update({
                        'queue_id': submission.queueId,
                        'labeling_task_id': submission.labelingTaskId,
                        'created_at': submission.createdAt,
                        'data': record['data']
                    }).eq('id', submission.id).execute()
                except Exception as ue:
                    logging.error("Failed to update existing submission %s: %s", submission.id, str(ue))
            else:
                raise
    return {"message": f"Uploaded {len(data)} submissions"}

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
    subs = supabase.table('submissions').select('id').eq('queue_id', queue_id).execute()
    submission_ids = [s['id'] for s in subs.data]
    assigns = supabase.table('assignments').select('question_id, judge_id').eq('queue_id', queue_id).execute()
    judges_resp = supabase.table('judges').select('*').execute()
    judges = {j['id']: j for j in judges_resp.data}

    tasks = []
    for sub_id in submission_ids:
        for assign in assigns.data:
            tasks.append(run_single_judge(sub_id, assign['question_id'], str(assign['judge_id']), supabase, groq_client, judges))
    
    results = await asyncio.gather(*tasks)
    evaluations = [r for r in results if r is not None]
    if evaluations:
        supabase.table('evaluations').insert(evaluations).execute()
    return {"message": f"Evaluations completed for {len(submission_ids)} submissions and {len(assigns.data)} assignments"}

@app.get("/evaluations")
def get_evaluations(queue_id: str = None, judge_id: str = None, question_id: str = None, verdict: str = None, page: int = 1, limit: int = 50):
    try:
        query = supabase.table('evaluations').select('*', count='exact')
        if queue_id:
            subs = supabase.table('submissions').select('id').eq('queue_id', queue_id).execute()
            submission_ids = [s['id'] for s in subs.data]
            if not submission_ids:
                return {"evaluations": [], "total": 0}
            query = query.in_('submission_id', submission_ids)
        if judge_id:
            query = query.eq('judge_id', judge_id)
        if question_id:
            query = query.eq('question_id', question_id)
        if verdict:
            query = query.eq('verdict', verdict)
        
        offset = (page - 1) * limit
        response = query.range(offset, offset + limit - 1).execute()
        return {"evaluations": response.data, "total": response.count}
    except Exception as e:
        logging.error("Error fetching evaluations: %s", str(e))
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
