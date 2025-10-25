import os
from functools import lru_cache
from typing import List

class Settings:
    def __init__(self) -> None:
        self.upload_batch_size = int(os.getenv("UPLOAD_BATCH_SIZE", "100"))
        self.run_judges_page = int(os.getenv("RUN_JUDGES_PER_PAGE", "1000"))
        self.job_batch_size = int(os.getenv("JOB_BATCH_SIZE", "500"))
        self.evaluations_page_limit = int(os.getenv("EVALUATIONS_PAGE_LIMIT", "50"))
        self.cors_origins = [origin.strip() for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()