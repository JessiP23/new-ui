import os
from functools import lru_cache
from typing import Optional
from supabase import Client, create_client

class SupabaseConfigMissing(RuntimeError):
    pass

@lru_cache
def get_supabase_client() -> Client:
    url: Optional[str] = os.getenv("SUPABASE_URL")
    key: Optional[str] = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise SupabaseConfigMissing("Supabase configuration missing; set SUPABASE_URL and SUPABASE_KEY")
    return create_client(url, key)