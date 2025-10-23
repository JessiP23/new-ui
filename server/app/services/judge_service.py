import json
import asyncio
from supabase import Client
from groq import AsyncGroq
from app.services.fingerprint_service import simhash, hamming_distance

async def run_single_judge(submission_id: str, submission_data: dict, question_id: str, judge_id: str, existing_reason_hashes: dict, groq_client: AsyncGroq, judges: dict):
    """
    Run a single judge against provided submission data.
    - submission_data: parsed 'data' JSON from submissions table (dict with questions and answers)
    - existing_reason_hashes: mapping of (question_id, judge_id) -> list of simhash ints to check for duplicates
    This avoids per-call DB reads.
    """
    question = None
    for q in submission_data.get('questions', []):
        # q may be nested under 'data'
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
    # Duplicate detection using pre-fetched hashes
    key = (question_id, judge_id)
    for h in existing_reason_hashes.get(key, []):
        if hamming_distance(current_hash, h) < 10:
            return None

    judge = judges.get(judge_id)
    if not judge:
        return None

    prompt = f"{judge['system_prompt']}\n\nQuestion: {question.get('text', str(question))}\n\nAnswer: {answer_text}\n\nProvide verdict (pass/fail/inconclusive) and reasoning."

    response = await groq_client.chat.completions.create(
        model=judge['model'],
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )

    result = response.choices[0].message.content.strip()

    if 'pass' in result.lower():
        verdict = 'pass'
    elif 'fail' in result.lower():
        verdict = 'fail'
    else:
        verdict = 'inconclusive'

    return {
        'submission_id': submission_id,
        'question_id': question_id,
        'judge_id': judge_id,
        'verdict': verdict,
        'reasoning': result
    }