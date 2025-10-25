from fastapi import APIRouter
from app.api.routes import diagnostics, evaluations, judges, queue, submissions

api_router = APIRouter()
api_router.include_router(submissions.router)
api_router.include_router(judges.router)
api_router.include_router(queue.router)
api_router.include_router(evaluations.router)
api_router.include_router(diagnostics.router)