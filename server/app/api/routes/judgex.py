from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.dedalus_orchestrator import get_dedalus_orchestrator

router = APIRouter(prefix="/judgex", tags=["JudgeX"])

class JudgeXRequest(BaseModel):
    answer: str = Field(..., min_length=1)
    mode: Literal["standard", "adaptive"] = "standard"
    extra_tasks: Optional[List[str]] = None
    skip_auto_retry: bool = False

class JudgeXResponse(BaseModel):
    mode: Literal["standard", "adaptive"]
    domain: str
    domain_details: Optional[Any]
    agents_called: List[str]
    final_decision: Optional[str]
    confidence: Optional[float]
    agent_outputs: Dict[str, Any]
    final: Dict[str, Any]
    telemetry: Dict[str, Any]

@router.get("/capabilities")
def get_capabilities() -> Dict[str, Any]:
    orchestrator = get_dedalus_orchestrator()
    return orchestrator.capabilities()

@router.post("/judge", response_model=JudgeXResponse)
async def run_judgex(payload: JudgeXRequest) -> Dict[str, Any]:
    orchestrator = get_dedalus_orchestrator()
    try:
        result = await orchestrator.orchestrate(
            payload.answer,
            mode=payload.mode,
            extra_tasks=payload.extra_tasks,
            skip_auto_retry=payload.skip_auto_retry,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

@router.post("/judge/adaptive", response_model=JudgeXResponse)
async def run_adaptive_judgex(payload: JudgeXRequest) -> Dict[str, Any]:
    orchestrator = get_dedalus_orchestrator()
    try:
        result = await orchestrator.orchestrate(
            payload.answer,
            mode="adaptive",
            extra_tasks=payload.extra_tasks,
            skip_auto_retry=payload.skip_auto_retry,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc