from fastapi import APIRouter

from app.db import get_supabase

router = APIRouter()


# Deliberately unauthenticated: this is the counter on the marketing page, and
# it exposes a single global number, no workspace data.
@router.get("/stats/public")
async def public_stats():
    supabase = get_supabase()

    # count is computed from the Content-Range header regardless of the
    # limit, so this stays a cheap query even as the table grows.
    result = (
        supabase.table("meetings")
        .select("id", count="exact")
        .limit(1)
        .execute()
    )
    return {"meetings_processed": result.count or 0}
