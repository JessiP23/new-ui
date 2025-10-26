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
        self.attachments_bucket = os.getenv("SUPABASE_ATTACHMENTS_BUCKET", "attachments")
        self.attachments_signed_ttl = int(os.getenv("SUPABASE_ATTACHMENTS_TTL", "3600"))
        self.analytics_default_interval = os.getenv("ANALYTICS_DEFAULT_INTERVAL", "day")
        self.analytics_top_judges = int(os.getenv("ANALYTICS_TOP_JUDGES", "10"))

@lru_cache
def get_settings() -> Settings:
    return Settings()