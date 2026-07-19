"""Caller identity and workspace authorization.

Every handler in this app talks to Supabase with the service-role key, which
bypasses RLS. That makes verifying the caller this layer's job: without it any
request that merely *names* a workspace_id gets served as that workspace, and
removing someone from workspace_members wouldn't actually revoke their access.

Two rules follow from that, and the handlers stick to them:

1. Identity comes from the verified token, never from the request body. A
   field like `requester_user_id` is a claim the caller can set to anyone.
2. Anything reachable by id (a meeting, a workspace, an action item) is
   checked for membership before it is read or written. UUIDs leak — into
   URLs, browser history, screenshots — so knowing one is not authorization.

Tokens are verified locally rather than by calling the Auth API on every
request, which would add a round-trip to each one. Supabase signs either with
a per-project HS256 secret (legacy) or an asymmetric key published via JWKS;
both are handled.
"""

import asyncio
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient
from pydantic import BaseModel

from app.config import settings
from app.db import get_supabase

# Restricting this here is what stops an "alg" confusion attack: the algorithm
# is read from the (unverified) token header to pick a key type, so a token
# claiming e.g. "none" must never reach jwt.decode.
_SYMMETRIC_ALGS = {"HS256"}
_ASYMMETRIC_ALGS = {"RS256", "ES256"}

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(
            f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
        )
    return _jwks_client


def _decode(token: str) -> dict:
    alg = jwt.get_unverified_header(token).get("alg", "")

    if alg in _SYMMETRIC_ALGS:
        if not settings.supabase_jwt_secret:
            # 401, not 500: on a project signing with asymmetric keys (the
            # default now) an HS256 token can only be a forgery, and answering
            # unauthenticated input with a server error is both misleading and
            # a free way to fill the logs. The warning is here so that a real
            # misconfiguration on a legacy-secret project is still diagnosable.
            print("[auth] HS256 token received but SUPABASE_JWT_SECRET is unset — rejecting")
            raise HTTPException(status_code=401, detail="Invalid token")
        key = settings.supabase_jwt_secret
    elif alg in _ASYMMETRIC_ALGS:
        key = _get_jwks_client().get_signing_key_from_jwt(token).key
    else:
        raise HTTPException(status_code=401, detail="Unsupported token algorithm")

    return jwt.decode(token, key, algorithms=[alg], audience="authenticated")


class AuthUser(BaseModel):
    id: str
    email: str | None = None


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> AuthUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in")

    token = authorization.split(" ", 1)[1].strip()
    try:
        # to_thread because a JWKS cache miss fetches over the network, and
        # this runs on the event loop.
        claims = await asyncio.to_thread(_decode, token)
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — sign in again")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    return AuthUser(id=user_id, email=claims.get("email"))


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]


# `.single()` raises when it matches zero rows, which would surface a plain
# "not a member" as a 500. These use limit(1) so a miss is just an empty list.
def _fetch_role(workspace_id: str, user_id: str) -> str | None:
    result = (
        get_supabase()
        .table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0].get("role") if rows else None


def _fetch_meeting_workspace(meeting_id: str) -> str | None:
    result = (
        get_supabase()
        .table("meetings")
        .select("workspace_id")
        .eq("id", meeting_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0].get("workspace_id") if rows else None


def _fetch_action_item_workspace(action_item_id: str) -> str | None:
    result = (
        get_supabase()
        .table("action_items")
        .select("workspace_id")
        .eq("id", action_item_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0].get("workspace_id") if rows else None


async def require_workspace_member(workspace_id: str, user: AuthUser) -> str:
    """Confirm the caller belongs to the workspace. Returns their role."""
    role = await asyncio.to_thread(_fetch_role, workspace_id, user.id)
    if role is None:
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    return role


async def require_workspace_admin(workspace_id: str, user: AuthUser) -> None:
    role = await require_workspace_member(workspace_id, user)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only workspace admins can do this")


async def require_meeting_access(meeting_id: str, user: AuthUser) -> str:
    """Confirm the caller can reach this meeting. Returns its workspace_id.

    Handlers use the return value instead of a client-supplied workspace_id, so
    a caller can't attach someone else's meeting to their own workspace.
    """
    workspace_id = await asyncio.to_thread(_fetch_meeting_workspace, meeting_id)
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await require_workspace_member(workspace_id, user)
    return workspace_id


async def require_action_item_access(action_item_id: str, user: AuthUser) -> str:
    workspace_id = await asyncio.to_thread(_fetch_action_item_workspace, action_item_id)
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Action item not found")
    await require_workspace_member(workspace_id, user)
    return workspace_id
