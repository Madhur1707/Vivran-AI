from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Shared service-role client.

    Creating one per request built a fresh connection pool every time; the
    client is stateless as far as we use it, so a single instance is enough.
    """
    return create_client(settings.supabase_url, settings.supabase_service_key)
