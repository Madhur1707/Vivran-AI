"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  Phone,
  Plus,
  Shield,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { BG, MONO } from "@/lib/meeting-utils";

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

const CARD = {
  borderColor: "rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
};

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <Card
      size="sm"
      className="flex-row items-center gap-3 px-4 py-3"
      style={CARD}
    >
      <div className="rounded-lg bg-white/5 p-2 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-[17px] font-bold leading-none" style={BG}>
          {value}
        </p>
        <p className="mt-1 text-[10.5px] text-muted-foreground" style={MONO}>
          {label}
        </p>
      </div>
    </Card>
  );
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
  const adminCount = members.filter((m) => m.role === "admin").length;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

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

  async function handleRemove() {
    if (!confirmTarget) return;
    setRemoving(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/team/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          requester_user_id: myUserId,
          target_user_id: confirmTarget.user_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to remove member");

      toast.success(
        `Removed ${confirmTarget.full_name?.trim() || confirmTarget.email}`
      );
      setConfirmTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-[clamp(22px,3vw,28px)] font-bold tracking-tight"
          style={BG}
        >
          {workspaceName}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground" style={MONO}>
          {members.length} member{members.length !== 1 ? "s" : ""} ·{" "}
          {isAdmin ? "you're an admin" : "you're a member"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          value={members.length}
          label={members.length === 1 ? "member" : "members"}
        />
        <StatCard
          icon={<Shield className="h-4 w-4" />}
          value={adminCount}
          label={adminCount === 1 ? "admin" : "admins"}
        />
        {isAdmin ? (
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            value={pendingInvites.length}
            label={
              pendingInvites.length === 1 ? "pending invite" : "pending invites"
            }
          />
        ) : (
          <StatCard
            icon={<UserCheck className="h-4 w-4" />}
            value="member"
            label="your role"
          />
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left: members list */}
        <Card size="sm" className="gap-0 pb-0" style={CARD}>
          <CardHeader className="border-b">
            <CardTitle
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
              style={MONO}
            >
              <Users className="h-3.5 w-3.5" />
              Members
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {members.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-0">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 px-(--card-spacing) py-3"
              >
                <Avatar>
                  <AvatarFallback className="text-[10.5px] font-semibold">
                    {getInitials(m.full_name, m.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">
                      {m.full_name?.trim() || m.email}
                    </span>
                    {m.user_id === myUserId && (
                      <Badge
                        variant="outline"
                        className="h-4 shrink-0 px-1.5 text-[9.5px] text-muted-foreground"
                      >
                        you
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-2.5 w-2.5 shrink-0" />
                      {m.email}
                    </span>
                    {m.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        {m.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1" style={MONO}>
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      joined {formatDate(m.created_at)}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={m.role === "admin" ? "secondary" : "outline"}
                  className="shrink-0 text-[10px]"
                  style={MONO}
                >
                  {m.role === "admin" && <Shield />}
                  {m.role}
                </Badge>
                {isAdmin && m.user_id !== myUserId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmTarget(m)}
                    aria-label={`Remove ${m.email}`}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right: invite + pending invites / access info */}
        <div className="space-y-4">
          {isAdmin && (
            <Card size="sm" style={CARD}>
              <CardHeader>
                <CardTitle
                  className="flex items-center gap-1.5 text-[13px]"
                  style={BG}
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  Invite a team member
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-2">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="text-[13px]"
                  />
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="outline"
                            className="w-28 shrink-0 justify-between text-[12px] capitalize"
                          />
                        }
                      >
                        {inviteRole}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-auto min-w-(--anchor-width)"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer text-[12.5px]"
                          onClick={() => setInviteRole("member")}
                        >
                          Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-[12.5px]"
                          onClick={() => setInviteRole("admin")}
                        >
                          Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex-1 text-[12px] font-semibold"
                    >
                      {inviting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "Send invite"
                      )}
                    </Button>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                    They&apos;ll get an email — signing up with that exact
                    address joins them automatically.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          {isAdmin && pendingInvites.length > 0 && (
            <Card size="sm" className="gap-0 pb-0" style={CARD}>
              <CardHeader className="border-b">
                <CardTitle
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
                  style={MONO}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Pending invites
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {pendingInvites.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border px-0">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 px-(--card-spacing) py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px]">{inv.email}</p>
                      <p
                        className="mt-0.5 text-[10.5px] text-muted-foreground"
                        style={MONO}
                      >
                        invited {formatDate(inv.created_at)}
                      </p>
                    </div>
                    <Badge
                      className="shrink-0 text-[10px]"
                      style={{
                        background: "rgba(251,191,36,0.1)",
                        color: "#fbbf24",
                        ...MONO,
                      }}
                    >
                      {inv.role}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isAdmin && (
            <Card size="sm" style={CARD}>
              <CardHeader>
                <CardTitle
                  className="flex items-center gap-1.5 text-[13px]"
                  style={BG}
                >
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Your access
                </CardTitle>
                <CardDescription className="text-[11.5px] leading-relaxed">
                  You can see meetings you uploaded and meetings where you
                  were an attendee. Ask your workspace admin to invite more
                  teammates.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {/* Remove-member confirmation */}
      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle style={BG}>Remove team member?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {confirmTarget?.full_name?.trim() || confirmTarget?.email}
              </span>{" "}
              will lose access to this workspace and its meetings. You can
              invite them again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing && <Loader2 className="animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
