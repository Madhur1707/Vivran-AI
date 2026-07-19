import asyncio
import traceback

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUser, require_meeting_access, require_workspace_member
from app.db import get_supabase

router = APIRouter()

AUDIO_BUCKET = "meeting-audio"


class DeleteMeetingRequest(BaseModel):
    meeting_id: str


@router.post("/meetings/delete")
async def delete_meeting(req: DeleteMeetingRequest, user: CurrentUser):
    """Delete a meeting, its audio, and everything derived from it.

    Restricted to whoever uploaded it or a workspace admin. Any member can
    *read* a workspace's meetings, but deletion is irreversible, so it isn't
    something one member should be able to do to another's recording.
    """
    workspace_id = await require_meeting_access(req.meeting_id, user)
    role = await require_workspace_member(workspace_id, user)

    supabase = get_supabase()
    result = await asyncio.to_thread(
        lambda: supabase.table("meetings")
        .select("user_id, audio_path")
        .eq("id", req.meeting_id)
        .single()
        .execute()
    )
    row = result.data or {}

    if row.get("user_id") != user.id and role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only the person who uploaded this meeting, or a workspace admin, can delete it",
        )

    # Audio first. If this fails we still remove the row: an orphaned object is
    # recoverable (the purge script sweeps them), whereas leaving the meeting
    # in place means the user simply cannot delete their data.
    audio_path = row.get("audio_path")
    if audio_path:
        try:
            await asyncio.to_thread(
                lambda: supabase.storage.from_(AUDIO_BUCKET).remove([audio_path])
            )
        except Exception:
            print(f"[{req.meeting_id}] Deleting audio object failed (row still removed):")
            traceback.print_exc()

    # meeting_chunks and action_items are FK'd to meetings with on delete
    # cascade, so they go with it. If that ever stops being true this errors
    # loudly on the constraint rather than silently orphaning rows.
    await asyncio.to_thread(
        lambda: supabase.table("meetings").delete().eq("id", req.meeting_id).execute()
    )

    return {"status": "deleted", "meeting_id": req.meeting_id}
