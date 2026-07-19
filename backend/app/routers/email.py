import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUser, require_meeting_access
from app.config import settings
from app.db import get_supabase

router = APIRouter()


class SendFollowupRequest(BaseModel):
    meeting_id: str
    recipients: list[str] | None = None


class UpdateAttendeeEmailsRequest(BaseModel):
    meeting_id: str
    attendee_emails: dict[str, str]


class UpdateFollowupTextRequest(BaseModel):
    meeting_id: str
    follow_up_email: str


@router.post("/update-attendee-emails")
async def update_attendee_emails(req: UpdateAttendeeEmailsRequest, user: CurrentUser):
    await require_meeting_access(req.meeting_id, user)

    supabase = get_supabase()

    cleaned = {name: email.strip() for name, email in req.attendee_emails.items() if email.strip()}

    supabase.table("meetings").update({"attendee_emails": cleaned}).eq("id", req.meeting_id).execute()

    return {"status": "ok", "attendee_emails": cleaned}


@router.post("/update-followup-text")
async def update_followup_text(req: UpdateFollowupTextRequest, user: CurrentUser):
    await require_meeting_access(req.meeting_id, user)

    supabase = get_supabase()

    supabase.table("meetings").update({"follow_up_email": req.follow_up_email}).eq("id", req.meeting_id).execute()

    return {"status": "ok"}


@router.post("/send-followup")
async def send_followup(req: SendFollowupRequest, user: CurrentUser):
    await require_meeting_access(req.meeting_id, user)

    supabase = get_supabase()

    result = supabase.table("meetings").select(
        "title, follow_up_email, attendee_emails"
    ).eq("id", req.meeting_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    follow_up_email = result.data.get("follow_up_email")
    attendee_emails = result.data.get("attendee_emails") or {}
    title = result.data.get("title", "Meeting")

    if not follow_up_email:
        raise HTTPException(status_code=400, detail="No follow-up email generated yet")

    all_emails = set(attendee_emails.values())

    if req.recipients:
        # Only allow recipients that are actually on this meeting's attendee list
        recipients = [email for email in req.recipients if email in all_emails]
    else:
        recipients = list(all_emails)

    if not recipients:
        raise HTTPException(status_code=400, detail="No attendee email addresses provided")

    if not settings.resend_api_key:
        raise HTTPException(status_code=500, detail="Email sending is not configured")

    html_body = follow_up_email.replace("\n", "<br>")

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.resend_from_email,
                "to": recipients,
                "subject": f"Follow-up: {title}",
                "html": html_body,
            },
        )
        response.raise_for_status()

    supabase.table("meetings").update({
        "email_sent": True,
        "email_sent_to": recipients,
    }).eq("id", req.meeting_id).execute()

    return {"status": "sent", "recipients": recipients}
