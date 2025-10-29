import asyncio
import json
import math
import os
import textwrap
import time
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional
from dedalus_labs import AsyncDedalus, DedalusRunner
from dedalus_labs.utils.streaming import stream_async
from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = os.getenv("DEDALUS_MODEL", "openai/gpt-5-mini")
DEFAULT_TIMEOUT_SECONDS = int(os.getenv("DEDALUS_TIMEOUT_SECONDS", "90"))
MIN_CONFIDENCE = float(os.getenv("JUDGEX_MIN_CONFIDENCE", "0.65"))

TASK_INSTRUCTIONS: Dict[str, str] = {
    "evaluation": (
        "Assess the submission for factual accuracy, completeness, and alignment with the original prompt. "
        "Return JSON with keys: verdict ('pass'|'fail'|'inconclusive'), score (float 0-1 rounded to 2 decimals), "
        "strengths (array of short bullet strings), weaknesses (array of short bullet strings)."
    ),
    "feedback": (
        "Provide concise, constructive feedback to help the author improve. "
        "Return JSON with keys: summary (string), action_items (array of strings, each actionable), tone (string)."
    ),
    "reasoning": (
        "Explain the chain-of-thought that leads to an evaluation decision. "
        "Return JSON with keys: steps (array of strings), key_facts (array of strings), unresolved_questions (array of strings)."
    ),
    "classification": (
        "Identify the dominant domain of the submission (e.g., math, writing, coding, safety, ethics). "
        "Return JSON with keys: domain (string), confidence (float 0-1), rationale (string)."
    ),
    "math_reasoning": (
        "Carry out rigorous mathematical reasoning for the submission. "
        "Return JSON with keys: approach (string), solution (string), verification (string)."
    ),
    "clarity_feedback": (
        "Critique the clarity and communication quality of the submission. "
        "Return JSON with keys: readability (string), issues (array of strings), revision_suggestions (array of strings)."
    ),
    "code_review": (
        "Review the submission as source code. "
        "Return JSON with keys: correctness (string), issues (array of strings), improvements (array of strings)."
    ),
    "moderation": (
        "Screen the submission for safety, bias, or policy concerns. "
        "Return JSON with keys: risk_level ('low'|'medium'|'high'), findings (array of strings), escalation_needed (boolean)."
    ),
    "confidence_review": (
        "Synthesize previous agent outputs to gauge overall confidence. "
        "Return JSON with keys: confidence (float 0-1), concerns (array of strings), recommendation (string)."
    ),
    "judgment": (
        "Combine all agent outputs into a final judgment. "
        "Return JSON with keys: domain (string), agents_called (array of strings), final_decision (string), "
        "confidence (float 0-1), supporting_points (array of strings), risks (array of strings)."
    ),
}

DEFAULT_INSTRUCTIONS = (
    "Perform the requested reasoning task. Return JSON with keys: summary (string) and details (array of strings)."
)

BASE_PROMPT_TEMPLATE = textwrap.dedent(
    """
    You are Agent "{task_type}" inside the JudgeX evaluation collective.
    {instructions}

    User submission:
    \"\"\"{input_text}\"\"\"

    Return only the JSON object described above with no additional commentary.
    """
)

FINAL_PROMPT_TEMPLATE = textwrap.dedent(
        """
        You are the orchestrator of an AI Judge system called JudgeX built on FastAPI and Dedalus Labs.
        You coordinate specialised MCP agents (Evaluation, Feedback, Reasoning, Judgment, and any domain specialists).

        Your responsibilities:
        1. Reconcile the outputs from each agent listed below.
        2. Produce a single, unified JSON verdict capturing domain, final decision, confidence, supporting points, and risks.
        3. Reflect the actual agents consulted and respect any provided domain hints.
        4. If the domain hint is "unknown", infer it from the submission and agent outputs.

        User submission:
        \"\"\"{answer}\"\"\"

        Agent outputs (JSON):
        {agent_outputs_json}

        Domain hint from classifier: {domain_hint}
        Agents consulted: {agents_called_json}

        Return JSON exactly in this shape:
        {{
            "domain": "<string>",
            "agents_called": ["Evaluation", "Feedback", ...],
            "final_decision": "<succinct verdict>",
            "confidence": <float between 0 and 1>,
            "supporting_points": ["<bullet>", ...],
            "risks": ["<risk>", ...]
        }}
        """
)


class DedalusOrchestrator:
    """High-level orchestrator for JudgeX multi-agent workflows."""

    BASE_TASKS: tuple[str, ...] = ("evaluation", "feedback", "reasoning")
    OPTIONAL_TASKS: tuple[str, ...] = (
        "classification",
        "math_reasoning",
        "clarity_feedback",
        "code_review",
        "moderation",
        "confidence_review",
    )

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, timeout: Optional[int] = None) -> None:
        self.api_key = api_key or os.getenv("DEDALUS_API_KEY")
        self.default_model = model or DEFAULT_MODEL
        self.timeout = timeout or DEFAULT_TIMEOUT_SECONDS
        self.min_confidence = MIN_CONFIDENCE
        self.domain_routes: Dict[str, str] = {
            "math": "math_reasoning",
            "algebra": "math_reasoning",
            "geometry": "math_reasoning",
            "physics": "math_reasoning",
            "code": "code_review",
            "program": "code_review",
            "software": "code_review",
            "write": "clarity_feedback",
            "essay": "clarity_feedback",
            "story": "clarity_feedback",
            "safety": "moderation",
            "ethic": "moderation",
            "policy": "moderation",
        }

        self.client = AsyncDedalus(api_key=self.api_key) if self.api_key else AsyncDedalus()
        self.runner = DedalusRunner(self.client)

    async def orchestrate(
        self,
        answer: str,
        *,
        mode: str = "standard",
        extra_tasks: Optional[Iterable[str]] = None,
        skip_auto_retry: bool = False,
    ) -> Dict[str, Any]:
        """Run JudgeX orchestration for a submission."""

        normalized_answer = (answer or "").strip()
        if not normalized_answer:
            raise ValueError("answer cannot be empty")

        start = time.perf_counter()
        domain_details: Optional[Any] = None
        domain_hint: Optional[str] = None

        tasks: List[str] = list(self.BASE_TASKS)
        if extra_tasks:
            tasks.extend(extra_tasks)

        if mode == "adaptive":
            domain_raw = await self.run_workflow(normalized_answer, "classification")
            domain_details = self._coerce_output(domain_raw)
            domain_hint = self._extract_domain(domain_details, domain_raw)
            tasks.extend(self._route_tasks(domain_hint))

        tasks = list(dict.fromkeys(tasks))  # dedupe while preserving order

        agent_outputs = await self._gather_agent_outputs(normalized_answer, tasks)
        final_result = await self._finalize(normalized_answer, agent_outputs, domain_hint)
        summary = self._build_summary(
            mode=mode,
            agent_outputs=agent_outputs,
            final_result=final_result,
            domain_hint=domain_hint,
            domain_details=domain_details,
            start=start,
            iterations=1,
        )

        if summary["confidence"] is None:
            derived = self._derive_confidence_from_evaluation(agent_outputs)
            if derived is not None:
                summary["confidence"] = derived

        if (
            not skip_auto_retry
            and summary["confidence"] is not None
            and summary["confidence"] < self.min_confidence
        ):
            retry_task = "confidence_review"
            if retry_task not in agent_outputs:
                agent_outputs[retry_task] = self._coerce_output(
                    await self.run_workflow(normalized_answer, retry_task)
                )
            final_result = await self._finalize(normalized_answer, agent_outputs, domain_hint)
            summary = self._build_summary(
                mode=mode,
                agent_outputs=agent_outputs,
                final_result=final_result,
                domain_hint=domain_hint,
                domain_details=domain_details,
                start=start,
                iterations=2,
            )
            if summary["confidence"] is None:
                derived = self._derive_confidence_from_evaluation(agent_outputs)
                if derived is not None:
                    summary["confidence"] = derived

        return summary

    async def run_workflow(
        self,
        input_text: str,
        task_type: str = "evaluation",
        *,
        model: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        stream: bool = False,
    ) -> Any:
        """Execute a Dedalus workflow for a single agent."""

        prompt = custom_prompt or self._build_prompt(input_text, task_type)
        run_kwargs: Dict[str, Any] = {"input": prompt, "model": model or self.default_model}
        if stream:
            run_kwargs["stream"] = stream_async

        try:
            response = await asyncio.wait_for(self.runner.run(**run_kwargs), timeout=self.timeout)
        except asyncio.TimeoutError as exc:
            raise TimeoutError(f"Dedalus workflow '{task_type}' timed out after {self.timeout}s") from exc
        except Exception as exc:
            raise RuntimeError(f"Dedalus workflow '{task_type}' failed") from exc

        return getattr(response, "final_output", response)

    async def _gather_agent_outputs(self, answer: str, tasks: Iterable[str]) -> Dict[str, Any]:
        ordered_tasks = list(tasks)
        coroutines = [self.run_workflow(answer, task) for task in ordered_tasks]
        results = await asyncio.gather(*coroutines, return_exceptions=True)
        outputs: Dict[str, Any] = {}
        for task_name, raw in zip(ordered_tasks, results):
            if isinstance(raw, Exception):
                outputs[task_name] = {"error": str(raw)}
            else:
                outputs[task_name] = self._coerce_output(raw)
        return outputs

    async def _finalize(
        self,
        answer: str,
        agent_outputs: Dict[str, Any],
        domain_hint: Optional[str],
    ) -> Dict[str, Any]:
        agents_called = list(agent_outputs.keys())
        prompt = FINAL_PROMPT_TEMPLATE.format(
            answer=answer,
            agent_outputs_json=json.dumps(agent_outputs, ensure_ascii=False, indent=2),
            domain_hint=domain_hint or "unknown",
            agents_called_json=json.dumps(agents_called, ensure_ascii=False),
        )
        raw = await self.run_workflow(
            answer,
            "judgment",
            custom_prompt=prompt,
        )
        return self._coerce_output(raw)

    def _build_prompt(self, input_text: str, task_type: str) -> str:
        instructions = TASK_INSTRUCTIONS.get(task_type, DEFAULT_INSTRUCTIONS)
        return BASE_PROMPT_TEMPLATE.format(
            task_type=task_type,
            instructions=instructions,
            input_text=input_text,
        )

    def _coerce_output(self, raw: Any) -> Any:
        if isinstance(raw, (dict, list)):
            return raw
        if raw is None:
            return {"raw": None}
        text = str(raw).strip()
        if not text:
            return {"raw": ""}
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw": text}

    def _extract_domain(self, parsed: Any, raw: Any) -> Optional[str]:
        if isinstance(parsed, dict):
            for key in ("domain", "label", "category", "classification"):
                value = parsed.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        if isinstance(parsed, str) and parsed.strip():
            return parsed.strip()
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
        return None

    def _route_tasks(self, domain: Optional[str]) -> List[str]:
        if not domain:
            return []
        normalized = domain.lower()
        routed: List[str] = []
        for token, task in self.domain_routes.items():
            if token in normalized:
                routed.append(task)
        return routed

    def _derive_confidence_from_evaluation(self, agent_outputs: Dict[str, Any]) -> Optional[float]:
        evaluation = agent_outputs.get("evaluation")
        if isinstance(evaluation, dict):
            score = evaluation.get("score")
            confidence = self._normalize_confidence(score)
            if confidence is not None:
                return round(confidence, 3)
        return None

    def _normalize_confidence(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None
        if math.isnan(numeric) or math.isinf(numeric):
            return None
        return max(0.0, min(1.0, numeric))

    def _build_summary(
        self,
        *,
        mode: str,
        agent_outputs: Dict[str, Any],
        final_result: Dict[str, Any],
        domain_hint: Optional[str],
        domain_details: Optional[Any],
        start: float,
        iterations: int,
    ) -> Dict[str, Any]:
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        final_decision = final_result.get("final_decision")
        if isinstance(final_decision, (dict, list)):
            final_decision_text = json.dumps(final_decision, ensure_ascii=False)
        elif final_decision is not None:
            final_decision_text = str(final_decision)
        else:
            final_decision_text = None

        confidence = self._normalize_confidence(final_result.get("confidence"))
        domain = final_result.get("domain") or domain_hint or "unknown"

        agents_called = final_result.get("agents_called")
        if isinstance(agents_called, list):
            agents_list = [str(agent) for agent in agents_called]
        else:
            agents_list = list(agent_outputs.keys())

        summary = {
            "mode": mode,
            "domain": domain,
            "domain_details": domain_details,
            "agents_called": agents_list,
            "final_decision": final_decision_text,
            "confidence": confidence,
            "agent_outputs": agent_outputs,
            "final": final_result,
            "telemetry": {
                "elapsed_ms": elapsed_ms,
                "iterations": iterations,
                "model": self.default_model,
            },
        }
        return summary

    def capabilities(self) -> Dict[str, Any]:
        return {
            "default_model": self.default_model,
            "timeout_seconds": self.timeout,
            "min_confidence": self.min_confidence,
            "base_tasks": list(self.BASE_TASKS),
            "optional_tasks": list(self.OPTIONAL_TASKS),
            "domain_routes": self.domain_routes,
        }


@lru_cache(maxsize=1)
def get_dedalus_orchestrator() -> DedalusOrchestrator:
    return DedalusOrchestrator()
