function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export async function assignActionItem(params: {
  actionItemId: string;
  assigneeEmail: string | null;
  assigneeName: string | null;
  assignedBy: string;
}): Promise<{ status: string; assigned_to_email: string | null; assigned_to_name: string | null }> {
  const res = await fetch(`${apiUrl()}/api/actions/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action_item_id: params.actionItemId,
      assignee_email: params.assigneeEmail,
      assignee_name: params.assigneeName,
      assigned_by: params.assignedBy,
    }),
  });
  if (!res.ok) throw new Error("Failed to assign");
  return res.json();
}
