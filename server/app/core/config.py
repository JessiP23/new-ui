import os
from functools import lru_cache
from typing import List

class Settings:
    def __init__(self) -> None:
        self.upload_batch_size = 100
        self.run_judges_page = 1000
        self.job_batch_size = 500
        self.evaluations_page_limit = 50
        self.cors_origins = [origin.strip() for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()