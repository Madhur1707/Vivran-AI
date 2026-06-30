import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamPanel } from "@/components/team-panel";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .single();

  if (!myMembership) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No workspace found for your account yet. Try refreshing in a
          moment.
        </p>
      </div>
    );
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", myMembership.workspace_id)
    .single();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, email, phone, role, created_at")
    .eq("workspace_id", myMembership.workspace_id)
    .order("created_at", { ascending: true });

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const membersWithNames = (members ?? []).map((m) => ({
    ...m,
    full_name: nameById.get(m.user_id) ?? null,
  }));

  const { data: invites } =
    myMembership.role === "admin"
      ? await supabase
          .from("workspace_invites")
          .select("id, email, role, status, created_at")
          .eq("workspace_id", myMembership.workspace_id)
          .eq("status", "pending")
      : { data: [] };

  return (
    <TeamPanel
      workspaceId={myMembership.workspace_id}
      workspaceName={workspace?.name ?? "Your workspace"}
      myUserId={user.id}
      myRole={myMembership.role as "admin" | "member"}
      members={membersWithNames}
      pendingInvites={invites ?? []}
    />
  );
}
