import json
import asyncio
import time
from datetime import datetime, timezone
from supabase import Client
from groq import AsyncGroq
from app.services.fingerprint_service import simhash, hamming_distance

async def run_single_judge(submission_id: str, submission_data: dict, question_id: str, judge_id: str, existing_reason_hashes: dict, groq_client: AsyncGroq, judges: dict):
    question = None
    for q in submission_data.get('questions', []):
        qdata = q.get('data') if isinstance(q, dict) and 'data' in q else q
        if qdata and qdata.get('id') == question_id:
            question = qdata
            break
    if not question:
        return None

    answer = submission_data.get('answers', {}).get(question_id)
    if not answer:
        return None
    answer_text = ' '.join(str(v) for v in answer.values())

    current_hash = simhash(answer_text)
    key = (question_id, judge_id)
    for h in existing_reason_hashes.get(key, []):
        if hamming_distance(current_hash, h) < 10:
            return None

    judge = judges.get(judge_id)
    if not judge:
        return None

    q_text = question.get('questionText') or question.get('question_text') or question.get('text') or str(question)
    prompt = f"{judge.get('system_prompt', '')}\n\nQuestion: {q_text}\n\nAnswer: {answer_text}\n\nProvide verdict (pass/fail/inconclusive) and short reasoning."

    response = await groq_client.chat.completions.create(
        model=judge['model'],
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )

    result = response.choices[0].message.content.strip()

    low = result.lower()
    if 'pass' in low:
        verdict = 'pass'
    elif 'fail' in result.lower():
        verdict = 'fail'
    else:
        verdict = 'inconclusive'
    reasoning_simhash = None
    try:
        reasoning_simhash = simhash(result)
    except Exception:
        reasoning_simhash = None

    eval_obj = {
        'submission_id': submission_id,
        'question_id': question_id,
        'judge_id': judge_id,
        'verdict': verdict,
        'reasoning': result,
        'reasoning_simhash': reasoning_simhash,
        'created_at': datetime.now(timezone.utc).isoformat()
    }

    return eval_obj