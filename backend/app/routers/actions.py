import asyncio

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import AuthUser, CurrentUser, require_action_item_access
from app.config import settings
from app.db import get_supabase

router = APIRouter()


class AssignRequest(BaseModel):
    action_item_id: str
    assignee_email: str | None = None  # null/empty unassigns
    assignee_name: str | None = None


async def _assigner_name(user: AuthUser) -> str:
    """Who the notification email says assigned the item.

    Read from the authenticated user rather than the request body: a
    caller-supplied name would let anyone send mail that appears to come from
    a specific colleague.
    """
    def fetch():
        return (
            get_supabase()
            .table("profiles")
            .select("full_name")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )

    try:
        result = await asyncio.to_thread(fetch)
        rows = result.data or []
        name = (rows[0].get("full_name") or "").strip() if rows else ""
    except Exception:
        name = ""

    return name or user.email or "A teammate"


@router.post("/actions/assign")
async def assign_action_item(req: AssignRequest, user: CurrentUser):
    await require_action_item_access(req.action_item_id, user)

    supabase = get_supabase()

    item = (
        supabase.table("action_items")
        .select("id, task, deadline, meeting_id")
        .eq("id", req.action_item_id)
        .single()
        .execute()
    )
    if not item.data:
        raise HTTPException(status_code=404, detail="Action item not found")

    # Assignees are meeting attendees; not all have a saved email, so a
    # name-only assignment is allowed — it just skips the notification.
    email = (req.assignee_email or "").strip() or None
    name = (req.assignee_name or "").strip() or None

    supabase.table("action_items").update({
        "assigned_to_email": email,
        "assigned_to_name": name,
    }).eq("id", req.action_item_id).execute()

    if email and settings.resend_api_key:
        meeting = (
            supabase.table("meetings")
            .select("title")
            .eq("id", item.data["meeting_id"])
            .single()
            .execute()
        )
        meeting_title = meeting.data.get("title", "a meeting") if meeting.data else "a meeting"
        deadline = item.data.get("deadline")
        assigned_by = await _assigner_name(user)

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.resend_from_email,
                        "to": [email],
                        "subject": f"Action item assigned to you: {meeting_title}",
                        "html": (
                            f"<p>{assigned_by} assigned you an action item from "
                            f"<b>{meeting_title}</b>:</p>"
                            f"<blockquote>{item.data['task']}</blockquote>"
                            + (f"<p>Deadline: <b>{deadline}</b></p>" if deadline else "")
                            + "<p>Open Vivran.ai and check the Action Items page for details.</p>"
                        ),
                    },
                )
        except Exception:
            # Assignment itself succeeded; a failed notification shouldn't 500.
            pass

    return {"status": "assigned", "assigned_to_email": email, "assigned_to_name": name}
