"""One-off: index already-completed meetings into meeting_chunks for cross-meeting search.

Run from backend/ with: python scripts/backfill_meeting_chunks.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from supabase import create_client

from app.config import settings
from app.services.transcribe import index_meeting_chunks


def main():
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    result = (
        supabase.table("meetings")
        .select("id, workspace_id, title, transcript")
        .eq("status", "completed")
        .execute()
    )
    meetings = result.data or []
    print(f"Found {len(meetings)} completed meeting(s)")

    for m in meetings:
        if not m.get("transcript"):
            print(f"  skip {m['id']} ({m.get('title')}) — no transcript")
            continue
        if not m.get("workspace_id"):
            print(f"  skip {m['id']} ({m.get('title')}) — no workspace_id")
            continue

        index_meeting_chunks(supabase, m["id"], m["workspace_id"], m["transcript"])
        print(f"  indexed {m['id']} ({m.get('title')})")

    print("Done.")


if __name__ == "__main__":
    main()
