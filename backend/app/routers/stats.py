from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/stats/public")
async def public_stats():
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    # count is computed from the Content-Range header regardless of the
    # limit, so this stays a cheap query even as the table grows.
    result = (
        supabase.table("meetings")
        .select("id", count="exact")
        .limit(1)
        .execute()
    )
    return {"meetings_processed": result.count or 0}
