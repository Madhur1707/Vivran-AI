import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class InviteRequest(BaseModel):
    workspace_id: str
    inviter_user_id: str
    email: str
    role: str = "member"


class RemoveMemberRequest(BaseModel):
    workspace_id: str
    requester_user_id: str
    target_user_id: str


def _is_admin(supabase, workspace_id: str, user_id: str) -> bool:
    result = (
        supabase.table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return bool(result.data and result.data.get("role") == "admin")


@router.post("/team/invite")
async def invite_member(req: InviteRequest):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    if not _is_admin(supabase, req.workspace_id, req.inviter_user_id):
        raise HTTPException(status_code=403, detail="Only workspace admins can invite members")

    if req.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Invalid role")

    workspace = (
        supabase.table("workspaces")
        .select("name")
        .eq("id", req.workspace_id)
        .single()
        .execute()
    )
    workspace_name = workspace.data.get("name", "your team") if workspace.data else "your team"

    existing_member = (
        supabase.table("workspace_members")
        .select("id")
        .eq("workspace_id", req.workspace_id)
        .eq("email", req.email)
        .execute()
    )
    if existing_member.data:
        raise HTTPException(status_code=400, detail="This person is already a member")

    supabase.table("workspace_invites").upsert(
        {
            "workspace_id": req.workspace_id,
            "email": req.email,
            "role": req.role,
            "invited_by": req.inviter_user_id,
            "status": "pending",
        },
        on_conflict="workspace_id,email",
    ).execute()

    if settings.resend_api_key:
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
                        "to": [req.email],
                        "subject": f"You've been invited to join {workspace_name} on Vivran.ai",
                        "html": (
                            f"<p>You've been invited to join <b>{workspace_name}</b> on Vivran.ai "
                            f"as a <b>{req.role}</b>.</p>"
                            f"<p>Sign up at the link below using this exact email address "
                            f"({req.email}) to join automatically.</p>"
                        ),
                    },
                )
        except Exception:
            pass

    return {"status": "invited", "email": req.email}


@router.post("/team/remove-member")
async def remove_member(req: RemoveMemberRequest):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    if not _is_admin(supabase, req.workspace_id, req.requester_user_id):
        raise HTTPException(status_code=403, detail="Only workspace admins can remove members")

    target = (
        supabase.table("workspace_members")
        .select("role")
        .eq("workspace_id", req.workspace_id)
        .eq("user_id", req.target_user_id)
        .single()
        .execute()
    )
    if target.data and target.data.get("role") == "admin":
        admin_count = (
            supabase.table("workspace_members")
            .select("id", count="exact")
            .eq("workspace_id", req.workspace_id)
            .eq("role", "admin")
            .execute()
        )
        if (admin_count.count or 0) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the only admin")

    supabase.table("workspace_members").delete().eq("workspace_id", req.workspace_id).eq(
        "user_id", req.target_user_id
    ).execute()

    return {"status": "removed"}
