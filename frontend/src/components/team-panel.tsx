"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Phone,
  Shield,
  UserMinus,
  Loader2,
  Plus,
  Clock,
} from "lucide-react";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

interface Member {
  user_id: string;
  email: string;
  phone: string | null;
  role: "admin" | "member";
  created_at: string;
  full_name: string | null;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function TeamPanel({
  workspaceId,
  workspaceName,
  myUserId,
  myRole,
  members,
  pendingInvites,
}: {
  workspaceId: string;
  workspaceName: string;
  myUserId: string;
  myRole: "admin" | "member";
  members: Member[];
  pendingInvites: Invite[];
}) {
  const router = useRouter();
  const isAdmin = myRole === "admin";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          inviter_user_id: myUserId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to invite");

      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(targetUserId: string) {
    setRemovingId(targetUserId);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/team/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          requester_user_id: myUserId,
          target_user_id: targetUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to remove member");

      toast.success("Member removed");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1
          className="text-[clamp(22px,3vw,28px)] font-bold tracking-tight"
          style={BG}
        >
          {workspaceName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} member{members.length !== 1 ? "s" : ""} ·{" "}
          {isAdmin ? "You're an admin" : "You're a member"}
        </p>
      </div>

      {/* Invite form — admin only */}
      {isAdmin && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[12px] font-semibold" style={BG}>
              Invite a team member
            </p>
          </div>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-transparent rounded-lg border border-border px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground/40 focus:border-[rgba(255,255,255,0.4)] transition-colors min-w-0"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "admin" | "member")
              }
              className="bg-transparent rounded-lg border border-border px-2.5 py-2 text-[12px] outline-none cursor-pointer"
              style={{ color: "#e4e4e7" }}
            >
              <option value="member" style={{ color: "#000" }}>
                Member
              </option>
              <option value="admin" style={{ color: "#000" }}>
                Admin
              </option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                color: "#0a0a0a",
              }}
            >
              {inviting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Send invite"
              )}
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground mt-2">
            They&apos;ll get an email — they just need to sign up using that
            exact address to join automatically.
          </p>
        </div>
      )}

      {/* Pending invites — admin only */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: "#9999a8", ...MONO }}
            >
              Pending invites
            </p>
          </div>
          <div className="divide-y divide-border">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <span className="text-[13px] flex-1 truncate">
                  {inv.email}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(251,191,36,0.1)",
                    color: "#fbbf24",
                    ...MONO,
                  }}
                >
                  {inv.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "#9999a8", ...MONO }}
          >
            Members
          </p>
        </div>
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#e4e4e7",
                }}
              >
                {getInitials(m.full_name, m.email)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium truncate">
                    {m.full_name?.trim() || m.email}
                  </span>
                  {m.user_id === myUserId && (
                    <span className="text-[10px] text-muted-foreground">
                      (you)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Mail className="h-2.5 w-2.5" />
                    {m.email}
                  </span>
                  {m.phone && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="h-2.5 w-2.5" />
                      {m.phone}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background:
                    m.role === "admin"
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.05)",
                  color: m.role === "admin" ? "#e4e4e7" : "#9999a8",
                  ...MONO,
                }}
              >
                {m.role === "admin" && <Shield className="h-2.5 w-2.5" />}
                {m.role}
              </span>
              {isAdmin && m.user_id !== myUserId && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  disabled={removingId === m.user_id}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                  title="Remove member"
                >
                  {removingId === m.user_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <UserMinus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isAdmin && (
        <p className="text-[12px] text-muted-foreground">
          You can see meetings you uploaded and meetings where you were an
          attendee. Ask your workspace admin to invite more teammates.
        </p>
      )}
    </div>
  );
}
