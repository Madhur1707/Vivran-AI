import { apiFetch, apiPostJson } from "./api-client";

async function postJson<T>(
  path: string,
  body: unknown,
  fallbackError: string
): Promise<T> {
  const res = await apiPostJson(path, body);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? fallbackError);
  return data as T;
}

/**
 * Joins the signed-in user to any workspace they've been invited to. Safe to
 * call on every sign-in — it's idempotent and returns 0 when there's nothing
 * pending. Never throws: a failure here must not block getting into the app.
 */
export async function acceptPendingInvites(): Promise<number> {
  try {
    const res = await apiPostJson("/api/team/accept-invites", {});
    if (!res.ok) return 0;
    const data = await res.json();
    return data.joined ?? 0;
  } catch {
    return 0;
  }
}

export interface BulkInviteResult {
  invited: string[];
  skipped: { email: string; reason: string }[];
  total_rows: number;
}

// The API takes the acting user from the bearer token, so none of these send a
// requester/inviter id — as a body field it was just a claim, and anyone could
// have set it to a known admin's id.

export function inviteMember(params: {
  workspaceId: string;
  email: string;
  role: "admin" | "member";
}) {
  return postJson<{ status: string; email: string }>(
    "/api/team/invite",
    {
      workspace_id: params.workspaceId,
      email: params.email,
      role: params.role,
    },
    "Failed to invite"
  );
}

export function renameWorkspace(params: { workspaceId: string; name: string }) {
  return postJson<{ status: string; name: string }>(
    "/api/team/update-workspace",
    { workspace_id: params.workspaceId, name: params.name },
    "Failed to rename workspace"
  );
}

export function updateMemberRole(params: {
  workspaceId: string;
  targetUserId: string;
  role: "admin" | "member";
}) {
  return postJson<{ status: string; role: string }>(
    "/api/team/update-member-role",
    {
      workspace_id: params.workspaceId,
      target_user_id: params.targetUserId,
      role: params.role,
    },
    "Failed to update role"
  );
}

export function updateMemberDetails(params: {
  workspaceId: string;
  targetUserId: string;
  fullName: string;
  phone: string;
}) {
  return postJson<{
    status: string;
    full_name: string | null;
    phone: string | null;
  }>(
    "/api/team/update-member-details",
    {
      workspace_id: params.workspaceId,
      target_user_id: params.targetUserId,
      full_name: params.fullName,
      phone: params.phone,
    },
    "Failed to update details"
  );
}

export function cancelInvite(params: {
  workspaceId: string;
  inviteId: string;
}) {
  return postJson<{ status: string }>(
    "/api/team/cancel-invite",
    { workspace_id: params.workspaceId, invite_id: params.inviteId },
    "Failed to cancel invite"
  );
}

export function removeMember(params: {
  workspaceId: string;
  targetUserId: string;
}) {
  return postJson<{ status: string }>(
    "/api/team/remove-member",
    { workspace_id: params.workspaceId, target_user_id: params.targetUserId },
    "Failed to remove member"
  );
}

export async function bulkInviteMembers(params: {
  workspaceId: string;
  file: File;
}): Promise<BulkInviteResult> {
  const formData = new FormData();
  formData.append("workspace_id", params.workspaceId);
  formData.append("file", params.file);

  const res = await apiFetch("/api/team/bulk-invite", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Failed to import employees");
  return data as BulkInviteResult;
}
