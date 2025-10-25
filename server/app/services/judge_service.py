import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Literal, Optional

from pydantic import BaseModel, ValidationError

from app.services.fingerprint_service import simhash

logger = logging.getLogger(__name__)

class VerdictSchema(BaseModel):
    verdict: Literal['pass', 'fail', 'inconclusive']
    reasoning: Optional[str] = ''

async def _call_groq(client: Any, model: str, prompt: str) -> str:
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
    )
    return response.choices[0].message.content.strip()

async def _call_openai(client: Any, model: str, prompt: str) -> str:
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
    )
    return response.choices[0].message.content.strip()

async def _call_anthropic(client: Any, model: str, prompt: str) -> str:
    response = await client.messages.create(
        model=model,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    texts = [getattr(block, "text", "") for block in getattr(response, "content", [])]
    joined = " ".join(filter(None, texts)).strip()
    return joined or getattr(response, "message", {}).get("content", "").strip()

async def _call_gemini(client: Any, model: str, prompt: str) -> str:
    def _generate() -> Any:
        model_client = client.GenerativeModel(model)
        return model_client.generate_content(prompt)

    response = await asyncio.to_thread(_generate)
    if getattr(response, "text", None):
        return response.text.strip()
    candidates = getattr(response, "candidates", [])
    for candidate in candidates:
        parts = getattr(candidate, "content", {}).get("parts") if hasattr(candidate, "content") else None
        if parts:
            text_parts = [getattr(part, "text", "") for part in parts]
            joined = " ".join(filter(None, text_parts)).strip()
            if joined:
                return joined
    return ""

ProviderCall = Callable[[Any, str, str], Awaitable[str]]

PROVIDERS: Dict[str, ProviderCall] = {
    'groq': _call_groq,
    'openai': _call_openai,
    'anthropic': _call_anthropic,
    'gemini': _call_gemini,
}

PROMPT_TEMPLATE = (
    "{system_prompt}\n\n"
    "Question: {question_text}\n\n"
    "Answer: {answer_text}\n\n"
    "Response ONLY with a Json object: {{\"verdict\":\"pass|fail|inconclusive\",\"reasoning\":\"...\"}}\n"
)

async def _call_provider(
    provider: str,
    clients: Dict[str, Any],
    model: Optional[str],
    prompt: str,
) -> Optional[str]:
    provider_key = (provider or 'groq').lower()
    provider_fn = PROVIDERS.get(provider_key)
    if not provider_fn:
        logger.warning("judge.call_provider.unsupported", extra={"provider": provider_key})
        return None
    if not model:
        logger.warning("judge.call_provider.no_model", extra={"provider": provider_key})
        return None
    client = clients.get(provider_key)
    if client is None:
        logger.warning("judge.call_provider.missing_client", extra={"provider": provider_key})
        return None
    logger.debug("judge.call_provider.start", extra={"provider": provider_key, "model": model})
    return await provider_fn(client, model, prompt)

def _parse_verdict(raw: str) -> tuple[str, str]:
    try:
        parsed = VerdictSchema.parse_obj(json.loads(raw))
        return parsed.verdict, (parsed.reasoning or '').strip()
    except (json.JSONDecodeError, ValidationError):
        low = raw.lower()
        if 'pass' in low and 'fail' not in low:
            verdict = 'pass'
        elif 'fail' in low and 'pass' not in low:
            verdict = 'fail'
        else:
            verdict = 'inconclusive'
        return verdict, raw.strip()[:1000]

def _extract_question(submission_data: dict, question_id: str) -> Optional[dict]:
    for entry in submission_data.get('questions', []):
        data = entry.get('data') if isinstance(entry, dict) else entry
        if isinstance(data, dict) and data.get('id') == question_id:
            return data
    return None

async def run_single_judge(
    submission_id: str,
    submission_data: dict,
    question_id: str,
    judge_id: str,
    provider_clients: Dict[str, Any],
    judges: Dict[str, Dict[str, Any]],
):
    logger.debug(
        "judge.run_single_judge.start",
        extra={"submission_id": submission_id, "question_id": question_id, "judge_id": judge_id},
    )

    question = _extract_question(submission_data, question_id)
    if not question:
        logger.warning(
            "judge.run_single_judge.missing_question",
            extra={"submission_id": submission_id, "question_id": question_id, "judge_id": judge_id},
        )
        return None

    answer = submission_data.get('answers', {}).get(question_id)
    if not answer:
        logger.warning(
            "judge.run_single_judge.missing_answer",
            extra={"submission_id": submission_id, "question_id": question_id, "judge_id": judge_id},
        )
        return None

    judge = judges.get(judge_id)
    if not judge or judge.get('active') is False:
        logger.warning(
            "judge.run_single_judge.inactive_or_missing_judge",
            extra={"submission_id": submission_id, "question_id": question_id, "judge_id": judge_id},
        )
        return None

    answer_text = ' '.join(str(value) for value in answer.values())
    prompt = PROMPT_TEMPLATE.format(
        system_prompt=judge.get('system_prompt', ''),
        question_text=question.get('questionText') or question.get('question_text') or question.get('text') or str(question),
        answer_text=answer_text,
    )

    raw_response = await _call_provider(judge.get('provider', 'groq'), provider_clients, judge.get('model'), prompt)
    if raw_response is None:
        logger.warning(
            "judge.run_single_judge.provider_no_response",
            extra={
                "submission_id": submission_id,
                "question_id": question_id,
                "judge_id": judge_id,
                "provider": judge.get('provider', 'groq'),
                "model": judge.get('model'),
            },
        )
        return None
    verdict, reasoning = _parse_verdict(raw_response)
    reasoning = reasoning[:1000]

    logger.info(
        "judge.run_single_judge.success",
        extra={
            "submission_id": submission_id,
            "question_id": question_id,
            "judge_id": judge_id,
            "provider": judge.get('provider'),
            "verdict": verdict,
        },
    )

    return {
        'submission_id': submission_id,
        'question_id': question_id,
        'judge_id': judge_id,
        'verdict': verdict,
        'reasoning': reasoning,
        'reasoning_simhash': simhash(reasoning),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
