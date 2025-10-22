import json
from supabase import Client
from groq import Groq

def run_single_judge(submission_id: str, question_id: str, judge_id: str, supabase: Client, groq_client: Groq):
    sub_resp = supabase.table('submissions').select('data').eq('id', submission_id).execute()
    if not sub_resp.data:
        return
    sub_data = json.loads(sub_resp.data[0]['data'])
    
    question = None
    for q in sub_data['questions']:
        if q['data']['id'] == question_id:
            question = q['data']
            break
    if not question:
        return
    
    answer = sub_data['answers'].get(question_id)
    if not answer:
        return
    answer_text = ' '.join(str(v) for v in answer.values())
    
    judge_resp = supabase.table('judges').select('*').eq('id', judge_id).execute()
    if not judge_resp.data:
        return
    judge = judge_resp.data[0]
    
    prompt = f"{judge['system_prompt']}\n\nQuestion: {question.get('text', str(question))}\n\nAnswer: {answer_text}\n\nProvide verdict (pass/fail/inconclusive) and reasoning."
    
    response = groq_client.chat.completions.create(
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
    
    supabase.table('evaluations').insert({
        'submission_id': submission_id,
        'question_id': question_id,
        'judge_id': judge_id,
        'verdict': verdict,
        'reasoning': result
    }).execute()