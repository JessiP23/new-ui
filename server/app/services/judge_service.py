import json
import asyncio
import time
from datetime import datetime, timezone
from supabase import Client
from groq import AsyncGroq
from openai import AsyncOpenAI
from app.services.fingerprint_service import simhash, hamming_distance
from pydantic import BaseModel, ValidationError
from typing import Literal, Optional

class VerdictSchema(BaseModel):
    verdict: Literal['pass', 'fail', 'inconclusive']
    reasoning: Optional[str] = ''

async def _call_groq(groq_client: AsyncGroq, model: str, prompt: str):
    return await groq_client.chat.completions.create(
        model=model,
        messages=[{ "role": "user", "content": prompt }],
        max_tokens=400
    )

async def _call_openai(openai_client: AsyncOpenAI, model: str, prompt: str):
    if AsyncOpenAI is None:
        raise NotImplementedError("OpenAI not installed")
    return await openai_client.chat.completions.create(
        model=model,
        messages=[{ "role": "user", "content": prompt }],
        max_tokens=400
    )

PROVIDERS = {
    'groq': _call_groq,
    'openai': _call_openai,
}

PROMPT_TEMPLATE = (
    "{system_prompt}\n\n"
    "Question: {question_text}\n\n"
    "Answer: {answer_text}\n\n"
    "Response ONLY with a Json object: {{\"verdict\":\"pass|fail|inconclusive\",\"reasoning\":\"...\"}}\n"
)

async def _call_provider(provider: str, groq_client: AsyncGroq, openai_client: AsyncOpenAI, model: str, prompt: str):
    provider_fn = PROVIDERS.get(provider)
    if not provider_fn:
        raise NotImplementedError(f"Provider {provider} not supported")
    client = groq_client if provider == 'groq' else openai_client
    return await provider_fn(client, model, prompt)

async def run_single_judge(submission_id: str, submission_data: dict, question_id: str, judge_id: str, existing_reason_hashes: dict, groq_client: AsyncGroq, openai_client: AsyncOpenAI, judges: dict):
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
    prompt = PROMPT_TEMPLATE.format(
        system_prompt=judge.get('system_prompt', ''),
        question_text=q_text,
        answer_text=answer_text
    )

    provider = judge.get('provider', 'groq')
    response = await _call_provider(provider, groq_client, openai_client, judge.get('model'), prompt)

    raw = response.choices[0].message.content.strip()
    try:
        obj = json.loads(raw)
        v = VerdictSchema.parse_obj(obj)
        verdict = v.verdict
        reasoning = v.reasoning or ''
    except (json.JSONDecodeError, ValidationError):
        low = raw.lower()
        if 'pass' in low and 'fail' not in low:
            verdict = 'pass'
        elif 'fail' in low and 'pass' not in low:
            verdict = 'fail'
        else:
            verdict = 'inconclusive'
        reasoning = raw[:1000] 

    reasoning_simhash = simhash(reasoning)

    return {
        'submission_id': submission_id,
        'question_id': question_id,
        'judge_id': judge_id,
        'verdict': verdict,
        'reasoning': reasoning,
        'reasoning_simhash': reasoning_simhash,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
