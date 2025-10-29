from fastapi import APIRouter
from app.api.routes import analytics, diagnostics, evaluations, judges, judgex, queue, submissions

api_router = APIRouter()
api_router.include_router(submissions.router)
api_router.include_router(judges.router)
api_router.include_router(queue.router)
api_router.include_router(evaluations.router)
api_router.include_router(diagnostics.router)
api_router.include_router(analytics.router)
api_router.include_router(judgex.router)