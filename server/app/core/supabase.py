import os
from functools import lru_cache
from typing import Optional
import httpx
from supabase import Client, ClientOptions, create_client

class SupabaseConfigMissing(RuntimeError):
    pass

@lru_cache
def get_supabase_client() -> Client:
    url: Optional[str] = os.getenv("SUPABASE_URL")
    key: Optional[str] = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise SupabaseConfigMissing("Supabase configuration missing; set SUPABASE_URL and SUPABASE_KEY")
    http_client = httpx.Client(http2=False, timeout=httpx.Timeout(30.0))
    options = ClientOptions(httpx_client=http_client)
    return create_client(url, key, options=options)