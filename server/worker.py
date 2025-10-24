import os
import json
import asyncio
import logging
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client
from postgrest.exceptions import APIError
from groq import AsyncGroq
from openai import AsyncOpenAI
import backoff
from app.services.judge_service import run_single_judge

SUPABASE_URL = os.getenv('GROQ_API_KEY')
SUPABASE_KEY = os.getenv('SUPABASE_URL')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = AsyncGroq(api_key=GROQ_API_KEY)
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

CONCURRENCY = 1
BATCH = 10
POLL_INTERVAL = 5.0
MAX_ATTEMPTS = 3
JUDGES_REFRESH = 60

def should_retry(e):
    err_str = str(e).lower()
    return 'rate limit' in err_str or 'timeout' in err_str or '429' in err_str

@backoff.on_exception(backoff.expo, Exception, max_tries=10, jitter=backoff.random_jitter, giveup=lambda e: not should_retry(e))
async def process_job(job, judges_map):
    job_id = job['id']
    try:
        sub_id = job['submission_id']
        sub_data = job.get('submission_data') or {}
        qid = job['question_id']
        jid = str(job['judge_id'])

        eval_result = await run_single_judge(sub_id, sub_data, qid, jid, {}, groq_client, openai_client, judges_map)
        if eval_result:
            eval_result.setdefault('queue_id', job.get('queue_id'))
            eval_result.setdefault('created_at', datetime.now(timezone.utc).isoformat())
            eval_result.setdefault('updated_at', datetime.now(timezone.utc).isoformat())

            def insert_evaluation_safe(payload: dict):
                attempts = 0
                while attempts < max(5, len(payload)):
                    try:
                        supabase.table('evaluations').insert(payload).execute()
                        return True
                    except APIError as err:
                        msg = str(err)
                        import re
                        m = re.search(r"Could not find the '([a-zA-Z0-9_]+)' column", msg)
                        if m:
                            col = m.group(1)
                            if col in payload:
                                payload.pop(col, None)
                                attempts += 1
                                continue
                        raise

            try:
                insert_evaluation_safe(dict(eval_result))
            except Exception:
                logging.exception('Failed to insert evaluation after retries')
        supabase.table('judge_jobs').update({
            'status': 'done',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', job_id).execute()
    except Exception as e:
        logging.exception('Job failed %s', job_id)
        attempts = (job.get('attempts') or 0) + 1
        backoff_seconds = min(60, 2 ** attempts) if 'rate limit' in str(e).lower() or 'timeout' in str(e).lower() else 0
        if backoff_seconds > 0:
            await asyncio.sleep(backoff_seconds)
        status = 'failed' if attempts >= MAX_ATTEMPTS else 'pending'
        supabase.table('judge_jobs').update({
            'status': status,
            'attempts': attempts,
            'last_error': str(e),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', job_id).execute()

async def worker_loop():
    logging.info('Worker starting; poll interval=%s, concurrency=%s, batch=%s', POLL_INTERVAL, CONCURRENCY, BATCH)
    last_judges_fetch = 0
    judges_map = {}
    JUDGES_REFRESH = int(os.getenv('WORKER_JUDGE_REFRESH', '60'))

    while True:
        try:
            now = time.time()
            if now - last_judges_fetch > JUDGES_REFRESH or not judges_map:
                judges_resp = supabase.table('judges').select('*').execute()
                judges_map = {j['id']: j for j in (judges_resp.data or [])}
                last_judges_fetch = now

            resp = supabase.table('judge_jobs').select('*').eq('status', 'pending').limit(BATCH).execute()
            jobs = resp.data or []
            if not jobs:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            job_ids = [j['id'] for j in jobs]
            supabase.table('judge_jobs').update({'status': 'running', 'updated_at': datetime.now(timezone.utc).isoformat()}).in_('id', job_ids).execute()

            sem = asyncio.Semaphore(CONCURRENCY)
            async def run_with_sem(job):
                async with sem:
                    await process_job(job, judges_map)

            await asyncio.gather(*[run_with_sem(job) for job in jobs])
        except Exception:
            logging.exception('Worker loop exception; sleeping')
            await asyncio.sleep(POLL_INTERVAL)

if __name__ == '__main__':
    try:
        asyncio.run(worker_loop())
        logging.info("Worker started")
    except KeyboardInterrupt:
        logging.info('Worker stopped by user')

if __name__ == '__main__':
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logging.info('Worker stopped by user')
