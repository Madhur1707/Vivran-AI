"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Shield,
  ShieldOff,
  User,
  UserCheck,
  UserMinus,
  Users,
  UploadCloud,
  X,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BG, MONO } from "@/lib/meeting-utils";
import { normalizePhone } from "@/lib/phone";
import {
  bulkInviteMembers,
  cancelInvite,
  inviteMember,
  removeMember,
  renameWorkspace,
  updateMemberDetails,
  updateMemberRole,
} from "@/services/team-panel-service";

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

const ADMIN_TINT = { background: "rgba(129,140,248,0.12)", color: "#818cf8" };
const MEMBER_TINT = { background: "rgba(161,161,170,0.16)", color: "#d4d4d8" };
const PENDING_TINT = { background: "rgba(251,191,36,0.1)", color: "#fbbf24" };

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

  const [currentWorkspaceName, setCurrentWorkspaceName] =
    useState(workspaceName);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState(false);
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState(workspaceName);
  const [savingWorkspaceName, setSavingWorkspaceName] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(
    null,
  );

  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    invited: string[];
    skipped: { email: string; reason: string }[];
  } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      await inviteMember({
        workspaceId,
        inviterUserId: myUserId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRenameWorkspace() {
    const name = workspaceNameDraft.trim();
    if (!name || name === currentWorkspaceName) {
      setEditingWorkspaceName(false);
      setWorkspaceNameDraft(currentWorkspaceName);
      return;
    }

    setSavingWorkspaceName(true);
    try {
      const data = await renameWorkspace({
        workspaceId,
        requesterUserId: myUserId,
        name,
      });

      setCurrentWorkspaceName(data.name);
      setEditingWorkspaceName(false);
      toast.success("Workspace renamed");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to rename workspace",
      );
    } finally {
      setSavingWorkspaceName(false);
    }
  }

  async function handleRoleChange(member: Member, role: "admin" | "member") {
    setRoleChangeTarget(member.user_id);
    try {
      await updateMemberRole({
        workspaceId,
        requesterUserId: myUserId,
        targetUserId: member.user_id,
        role,
      });

      toast.success(
        `${member.full_name?.trim() || member.email} is now ${role === "admin" ? "an admin" : "a member"
        }`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setRoleChangeTarget(null);
    }
  }

  async function handleUpdateDetails() {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Name can't be empty");
      return;
    }

    setSavingDetails(true);
    try {
      await updateMemberDetails({
        workspaceId,
        requesterUserId: myUserId,
        targetUserId: editTarget.user_id,
        fullName: name,
        phone: editPhone.trim() ? normalizePhone(editPhone) : "",
      });

      toast.success("Member details updated");
      setEditTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update details",
      );
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleCancelInvite(invite: Invite) {
    setCancellingInviteId(invite.id);
    try {
      await cancelInvite({
        workspaceId,
        requesterUserId: myUserId,
        inviteId: invite.id,
      });

      toast.success(`Cancelled invite to ${invite.email}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel invite",
      );
    } finally {
      setCancellingInviteId(null);
    }
  }

  function downloadTemplate() {
    const csv = "Name,Email,Role\nJohn Doe,john@company.com,member\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkFile) return;

    setBulkUploading(true);
    try {
      const { invited, skipped } = await bulkInviteMembers({
        workspaceId,
        inviterUserId: myUserId,
        file: bulkFile,
      });

      setBulkResult({ invited, skipped });
      toast.success(
        `Import complete — ${invited.length} invited, ${skipped.length} skipped`,
      );

      setBulkFile(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import employees",
      );
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleRemove() {
    if (!confirmTarget) return;
    setRemoving(true);
    try {
      await removeMember({
        workspaceId,
        requesterUserId: myUserId,
        targetUserId: confirmTarget.user_id,
      });

      toast.success(
        `Removed ${confirmTarget.full_name?.trim() || confirmTarget.email}`,
      );
      setConfirmTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove member",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {editingWorkspaceName ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={workspaceNameDraft}
              onChange={(e) => setWorkspaceNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameWorkspace();
                if (e.key === "Escape") {
                  setEditingWorkspaceName(false);
                  setWorkspaceNameDraft(currentWorkspaceName);
                }
              }}
              disabled={savingWorkspaceName}
              className="h-10 max-w-sm text-[20px] font-bold"
              style={BG}
            />
            <Button
              size="icon-sm"
              onClick={handleRenameWorkspace}
              disabled={savingWorkspaceName}
              aria-label="Save workspace name"
            >
              {savingWorkspaceName ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={savingWorkspaceName}
              onClick={() => {
                setEditingWorkspaceName(false);
                setWorkspaceNameDraft(currentWorkspaceName);
              }}
              aria-label="Cancel rename"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="group flex items-center gap-2">
            <h1
              className="text-[clamp(22px,3vw,28px)] font-bold tracking-tight"
              style={BG}
            >
              {currentWorkspaceName}
            </h1>
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setWorkspaceNameDraft(currentWorkspaceName);
                  setEditingWorkspaceName(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Rename workspace"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <p className="mt-1 text-[13px] text-muted-foreground" style={MONO}>
          {members.length} member{members.length !== 1 ? "s" : ""} ·{" "}
          {isAdmin ? "you're an admin" : "you're a member"}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left: overview stats + members list */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

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
              {members.map((m) => {
                const isMe = m.user_id === myUserId;
                const canManage = isAdmin && !isMe;
                const isLastAdmin = m.role === "admin" && adminCount <= 1;
                const roleChanging = roleChangeTarget === m.user_id;
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3 px-(--card-spacing) py-3"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback
                        className="text-[10.5px] font-semibold"
                        style={m.role === "admin" ? ADMIN_TINT : undefined}
                      >
                        {getInitials(m.full_name, m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium">
                          {m.full_name?.trim() || m.email}
                        </span>
                        {isMe && (
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
                      className="h-5 shrink-0 gap-1 px-2 text-[10px]"
                      style={m.role === "admin" ? ADMIN_TINT : MEMBER_TINT}
                    >
                      {m.role === "admin" ? (
                        <Shield className="h-2.5 w-2.5" />
                      ) : (
                        <User className="h-2.5 w-2.5" />
                      )}
                      {m.role}
                    </Badge>
                    <div className="flex w-7 shrink-0 justify-end">
                      {canManage &&
                        (roleChanging ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-muted-foreground hover:text-foreground"
                                  aria-label={`Actions for ${m.email}`}
                                />
                              }
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-auto min-w-48"
                            >
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 whitespace-nowrap text-[12.5px]"
                                onClick={() => {
                                  setEditTarget(m);
                                  setEditName(m.full_name?.trim() || "");
                                  setEditPhone(m.phone || "");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5 shrink-0" />
                                Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isLastAdmin}
                                className="cursor-pointer gap-2 whitespace-nowrap text-[12.5px]"
                                onClick={() =>
                                  handleRoleChange(
                                    m,
                                    m.role === "admin" ? "member" : "admin",
                                  )
                                }
                              >
                                {m.role === "admin" ? (
                                  <>
                                    <ShieldOff className="h-3.5 w-3.5 shrink-0" />
                                    Make member
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-3.5 w-3.5 shrink-0" />
                                    Make admin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer gap-2 whitespace-nowrap text-[12.5px]"
                                onClick={() => setConfirmTarget(m)}
                              >
                                <UserMinus className="h-3.5 w-3.5 shrink-0" />
                                Remove from workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: invite actions / pending invites / access info */}
        <div className="space-y-3">
          {isAdmin ? (
            pendingInvites.length > 0 ? (
              <Sheet>
                <SheetTrigger
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-white/3"
                  style={CARD}
                >
                  <div className="rounded-lg bg-white/5 p-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[17px] font-bold leading-none"
                      style={BG}
                    >
                      {pendingInvites.length}
                    </p>
                    <p
                      className="mt-1 text-[10.5px] text-muted-foreground"
                      style={MONO}
                    >
                      pending invite{pendingInvites.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
                    View details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-sm">
                  <SheetHeader>
                    <SheetTitle style={BG}>Pending invites</SheetTitle>
                    <SheetDescription>
                      {pendingInvites.length} invite
                      {pendingInvites.length !== 1 ? "s" : ""} waiting to be
                      accepted.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="-mx-4 flex-1 divide-y divide-border overflow-y-auto">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 px-4 py-2.5"
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
                          style={{ ...PENDING_TINT, ...MONO }}
                        >
                          {inv.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleCancelInvite(inv)}
                          disabled={cancellingInviteId === inv.id}
                          aria-label={`Cancel invite to ${inv.email}`}
                        >
                          {cancellingInviteId === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                value={0}
                label="pending invites"
              />
            )
          ) : (
            <StatCard
              icon={<UserCheck className="h-4 w-4" />}
              value="Member"
              label="your role"
            />
          )}

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
                    They&apos;ll get an email automatically — signing up with
                    that exact address joins them right away.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card size="sm" style={CARD}>
              <CardHeader>
                <CardTitle
                  className="flex items-center gap-1.5 text-[13px]"
                  style={BG}
                >
                  <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                  Bulk import employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBulkUpload} className="space-y-2">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                    className="text-[12px] file:text-[12px]"
                  />
                  <Button
                    type="submit"
                    disabled={bulkUploading || !bulkFile}
                    className="w-full text-[12px] font-semibold"
                  >
                    {bulkUploading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload &amp; invite
                      </>
                    )}
                  </Button>
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={downloadTemplate}
                      className="h-auto gap-1 px-0 text-[10.5px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                    >
                      <Download className="h-2.5 w-2.5" />
                      Download template (.csv)
                    </Button>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                    Columns: <span className="font-medium">Name</span>,{" "}
                    <span className="font-medium">Email</span> (required),{" "}
                    <span className="font-medium">Role</span> (optional,
                    defaults to member). Everyone invited gets an automatic
                    email.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          {isAdmin && bulkResult && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 ring-1 ring-foreground/10"
              style={CARD}
            >
              <CheckCircle2
                className="h-4 w-4 shrink-0"
                style={{ color: "#22c55e" }}
              />
              <div className="min-w-0 flex-1 text-[12px] leading-snug">
                <span className="font-semibold">
                  {bulkResult.invited.length} invited
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  — emails sent automatically
                </span>
              </div>
              {bulkResult.skipped.length > 0 && (
                <Sheet>
                  <SheetTrigger
                    className="shrink-0 text-[11px] font-semibold hover:underline"
                    style={{ color: "#fbbf24" }}
                  >
                    {bulkResult.skipped.length} skipped
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full max-w-sm">
                    <SheetHeader>
                      <SheetTitle style={BG}>Skipped rows</SheetTitle>
                      <SheetDescription>
                        These rows from your last upload weren&apos;t invited.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="-mx-4 flex-1 divide-y divide-border overflow-y-auto">
                      {bulkResult.skipped.map((s, i) => (
                        <div
                          key={`${s.email}-${i}`}
                          className="flex items-center justify-between gap-2 px-4 py-2.5"
                        >
                          <span className="truncate text-[12.5px]">
                            {s.email}
                          </span>
                          <span
                            className="shrink-0 text-[10.5px] text-muted-foreground"
                            style={MONO}
                          >
                            {s.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setBulkResult(null)}
                aria-label="Dismiss import result"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
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
                  You can see meetings you uploaded and meetings where you were
                  an attendee. Ask your workspace admin to invite more
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

      {/* Edit member details */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle style={BG}>Edit member details</DialogTitle>
            <DialogDescription>
              Updates {editTarget?.email}&apos;s profile in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={savingDetails}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">
                Phone{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={savingDetails}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm" />}
              disabled={savingDetails}
            >
              Cancel
            </DialogClose>
            <Button
              size="sm"
              onClick={handleUpdateDetails}
              disabled={savingDetails || !editName.trim()}
            >
              {savingDetails && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
