import logging
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import get_settings

load_dotenv()

def create_app() -> FastAPI:
    settings = get_settings()
    fastapi_app = FastAPI(title="AI Judge Backend")
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    fastapi_app.include_router(api_router)

    @fastapi_app.get("/")
    def root() -> dict[str, Any]:
        return {"message": "AI Judge backend running!"}

    return fastapi_app

app = create_app()