function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

async function postJson<T>(
  path: string,
  body: unknown,
  fallbackError: string
): Promise<T> {
  const res = await fetch(`${apiUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? fallbackError);
  return data as T;
}

export interface BulkInviteResult {
  invited: string[];
  skipped: { email: string; reason: string }[];
  total_rows: number;
}

export function inviteMember(params: {
  workspaceId: string;
  inviterUserId: string;
  email: string;
  role: "admin" | "member";
}) {
  return postJson<{ status: string; email: string }>(
    "/api/team/invite",
    {
      workspace_id: params.workspaceId,
      inviter_user_id: params.inviterUserId,
      email: params.email,
      role: params.role,
    },
    "Failed to invite"
  );
}

export function renameWorkspace(params: {
  workspaceId: string;
  requesterUserId: string;
  name: string;
}) {
  return postJson<{ status: string; name: string }>(
    "/api/team/update-workspace",
    {
      workspace_id: params.workspaceId,
      requester_user_id: params.requesterUserId,
      name: params.name,
    },
    "Failed to rename workspace"
  );
}

export function updateMemberRole(params: {
  workspaceId: string;
  requesterUserId: string;
  targetUserId: string;
  role: "admin" | "member";
}) {
  return postJson<{ status: string; role: string }>(
    "/api/team/update-member-role",
    {
      workspace_id: params.workspaceId,
      requester_user_id: params.requesterUserId,
      target_user_id: params.targetUserId,
      role: params.role,
    },
    "Failed to update role"
  );
}

export function updateMemberDetails(params: {
  workspaceId: string;
  requesterUserId: string;
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
      requester_user_id: params.requesterUserId,
      target_user_id: params.targetUserId,
      full_name: params.fullName,
      phone: params.phone,
    },
    "Failed to update details"
  );
}

export function cancelInvite(params: {
  workspaceId: string;
  requesterUserId: string;
  inviteId: string;
}) {
  return postJson<{ status: string }>(
    "/api/team/cancel-invite",
    {
      workspace_id: params.workspaceId,
      requester_user_id: params.requesterUserId,
      invite_id: params.inviteId,
    },
    "Failed to cancel invite"
  );
}

export function removeMember(params: {
  workspaceId: string;
  requesterUserId: string;
  targetUserId: string;
}) {
  return postJson<{ status: string }>(
    "/api/team/remove-member",
    {
      workspace_id: params.workspaceId,
      requester_user_id: params.requesterUserId,
      target_user_id: params.targetUserId,
    },
    "Failed to remove member"
  );
}

export async function bulkInviteMembers(params: {
  workspaceId: string;
  inviterUserId: string;
  file: File;
}): Promise<BulkInviteResult> {
  const formData = new FormData();
  formData.append("workspace_id", params.workspaceId);
  formData.append("inviter_user_id", params.inviterUserId);
  formData.append("file", params.file);

  const res = await fetch(`${apiUrl()}/api/team/bulk-invite`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Failed to import employees");
  return data as BulkInviteResult;
}
