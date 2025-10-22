import json
import asyncio
from supabase import Client
from groq import AsyncGroq
from app.services.fingerprint_service import simhash, hamming_distance

async def run_single_judge(submission_id: str, question_id: str, judge_id: str, supabase: Client, groq_client: AsyncGroq, judges: dict):
    sub_resp = supabase.table('submissions').select('data').eq('id', submission_id).execute()
    if not sub_resp.data:
        return None
    sub_data = json.loads(sub_resp.data[0]['data'])
    
    question = None
    for q in sub_data['questions']:
        if q['data']['id'] == question_id:
            question = q['data']
            break
    if not question:
        return None
    
    answer = sub_data['answers'].get(question_id)
    if not answer:
        return None
    answer_text = ' '.join(str(v) for v in answer.values())
    
    # Check for similar answers
    existing_evals = supabase.table('evaluations').select('reasoning').eq('question_id', question_id).eq('judge_id', judge_id).execute()
    current_hash = simhash(answer_text)
    for e in existing_evals.data:
        if hamming_distance(current_hash, simhash(e['reasoning'])) < 10:  # threshold
            return None  # Skip duplicate
    
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