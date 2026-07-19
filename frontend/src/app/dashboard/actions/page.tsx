import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  ActionItemsBoard,
  type ActionItemRow,
  type MeetingInfo,
} from "@/components/action-items-board";

export default async function ActionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No workspace found for your account yet. Try refreshing in a moment.
        </p>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("action_items")
    .select(
      "id, meeting_id, owner, task, deadline, status, assigned_to_email, assigned_to_name, created_at, meetings(title)"
    )
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  const rows: ActionItemRow[] = (items ?? []).map((it) => {
    const meeting = Array.isArray(it.meetings) ? it.meetings[0] : it.meetings;
    return {
      id: it.id,
      meeting_id: it.meeting_id,
      meeting_title: meeting?.title ?? "Untitled meeting",
      owner: it.owner ?? "Team",
      task: it.task,
      deadline: it.deadline,
      status: it.status === "done" ? "done" : "open",
      assigned_to_email: it.assigned_to_email,
      assigned_to_name: it.assigned_to_name,
      created_at: it.created_at,
    };
  });

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, created_at, attendees, attendee_emails")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false });

  return (
    <ActionItemsBoard
      initialItems={rows}
      meetings={(meetings ?? []) as MeetingInfo[]}
    />
  );
}
