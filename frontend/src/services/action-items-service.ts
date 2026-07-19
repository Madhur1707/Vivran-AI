import { apiPostJson } from "./api-client";

/**
 * The "assigned by" name on the notification email comes from the caller's
 * token on the server, so it isn't sent from here.
 */
export async function assignActionItem(params: {
  actionItemId: string;
  assigneeEmail: string | null;
  assigneeName: string | null;
}): Promise<{ status: string; assigned_to_email: string | null; assigned_to_name: string | null }> {
  const res = await apiPostJson("/api/actions/assign", {
    action_item_id: params.actionItemId,
    assignee_email: params.assigneeEmail,
    assignee_name: params.assigneeName,
  });
  if (!res.ok) throw new Error("Failed to assign");
  return res.json();
}
