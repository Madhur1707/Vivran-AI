"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { BG, MONO } from "@/lib/meeting-utils";

export interface ActionItemRow {
  id: string;
  meeting_id: string;
  meeting_title: string;
  owner: string;
  task: string;
  deadline: string | null;
  status: "open" | "done";
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  created_at: string;
}

export interface MeetingInfo {
  id: string;
  title: string;
  created_at: string;
  attendees: string[] | null;
  attendee_emails: Record<string, string> | null;
}

interface AttendeeOption {
  name: string;
  email: string | null;
}

const CARD = {
  borderColor: "rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
};

export function ActionItemsBoard({
  initialItems,
  meetings,
  assignedBy,
}: {
  initialItems: ActionItemRow[];
  meetings: MeetingInfo[];
  assignedBy: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialItems[0]?.meeting_id ?? null
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">(
    "all"
  );
  const [ownerFilter, setOwnerFilter] = useState("all");

  const meetingsById = useMemo(
    () => new Map(meetings.map((m) => [m.id, m])),
    [meetings]
  );

  // Left panel: meetings that actually have action items, newest first.
  const meetingGroups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; latest: string; open: number; total: number }
    >();
    for (const it of items) {
      const g = map.get(it.meeting_id) ?? {
        id: it.meeting_id,
        title: it.meeting_title,
        latest: it.created_at,
        open: 0,
        total: 0,
      };
      g.total += 1;
      if (it.status === "open") g.open += 1;
      if (it.created_at > g.latest) g.latest = it.created_at;
      map.set(it.meeting_id, g);
    }
    return Array.from(map.values()).sort((a, b) =>
      b.latest.localeCompare(a.latest)
    );
  }, [items]);

  const selectedMeeting = selectedId ? meetingsById.get(selectedId) : null;
  const selectedGroup = meetingGroups.find((g) => g.id === selectedId);

  const meetingItems = items.filter((it) => it.meeting_id === selectedId);
  const owners = useMemo(
    () => Array.from(new Set(meetingItems.map((it) => it.owner))).sort(),
    [meetingItems]
  );
  const visibleItems = meetingItems.filter(
    (it) =>
      (statusFilter === "all" || it.status === statusFilter) &&
      (ownerFilter === "all" || it.owner === ownerFilter)
  );

  const attendeeOptions: AttendeeOption[] = useMemo(() => {
    const emails = selectedMeeting?.attendee_emails ?? {};
    return (selectedMeeting?.attendees ?? []).map((name) => ({
      name,
      email: emails[name] ?? null,
    }));
  }, [selectedMeeting]);

  const openCount = items.filter((it) => it.status === "open").length;
  const doneCount = items.length - openCount;

  function selectMeeting(id: string) {
    setSelectedId(id);
    setStatusFilter("all");
    setOwnerFilter("all");
  }

  function patchItem(id: string, patch: Partial<ActionItemRow>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  async function toggleStatus(item: ActionItemRow) {
    const next = item.status === "open" ? "done" : "open";
    patchItem(item.id, { status: next });

    const supabase = createClient();
    const { error } = await supabase
      .from("action_items")
      .update({ status: next })
      .eq("id", item.id);

    if (error) {
      patchItem(item.id, { status: item.status });
      toast.error("Could not update the action item");
    } else {
      toast.success(next === "done" ? "Marked as done" : "Reopened");
    }
  }

  async function assignTo(item: ActionItemRow, attendee: AttendeeOption | null) {
    const prev = {
      assigned_to_email: item.assigned_to_email,
      assigned_to_name: item.assigned_to_name,
    };
    patchItem(item.id, {
      assigned_to_email: attendee?.email ?? null,
      assigned_to_name: attendee?.name ?? null,
    });

    // The backend sends the notification email before responding, so this
    // request can take a few seconds — show progress right away.
    const toastId = toast.loading(
      !attendee
        ? "Removing assignment…"
        : attendee.email
          ? `Assigning to ${attendee.name} and sending them an email…`
          : `Assigning to ${attendee.name}…`
    );

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/api/actions/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_item_id: item.id,
          assignee_email: attendee?.email ?? null,
          assignee_name: attendee?.name ?? null,
          assigned_by: assignedBy,
        }),
      });
      if (!res.ok) throw new Error();

      if (!attendee) {
        toast.success("Assignment removed", { id: toastId });
      } else if (attendee.email) {
        toast.success(`Assigned to ${attendee.name} — they've been emailed`, {
          id: toastId,
        });
      } else {
        toast.success(
          `Assigned to ${attendee.name} (no email on file, so no notification was sent)`,
          { id: toastId }
        );
      }
    } catch {
      patchItem(item.id, prev);
      toast.error("Could not assign. Is the backend running?", { id: toastId });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-[clamp(22px,3vw,28px)] font-bold tracking-tight"
          style={BG}
        >
          Action Items
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground" style={MONO}>
          {openCount} open · {doneCount} done · across all meetings
        </p>
      </div>

      {items.length === 0 ? (
        <Card
          className="flex flex-col items-center justify-center rounded-2xl py-20"
          style={CARD}
        >
          <p className="text-sm text-muted-foreground">
            No action items yet — they&apos;ll appear here after your meetings
            are processed.
          </p>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
          {/* Left: meetings */}
          <Card className="gap-0 rounded-2xl p-2" style={CARD}>
            <p
              className="px-3 pb-2 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground"
              style={MONO}
            >
              Meetings
            </p>
            <div className="space-y-1">
              {meetingGroups.map((g) => {
                const isSelected = g.id === selectedId;
                return (
                  <button
                    key={g.id}
                    onClick={() => selectMeeting(g.id)}
                    className="w-full rounded-lg px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: isSelected
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate text-[13px] font-medium"
                        style={{ color: isSelected ? "#e4e4e7" : undefined }}
                      >
                        {g.title}
                      </span>
                      {g.open > 0 ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10.5px]"
                        >
                          {g.open} open
                        </Badge>
                      ) : (
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: "#4ade80" }}
                        />
                      )}
                    </div>
                    <span
                      className="mt-0.5 block text-[11px] text-muted-foreground"
                      style={MONO}
                    >
                      {meetingsById.get(g.id)
                        ? new Date(
                          meetingsById.get(g.id)!.created_at
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                        : ""}
                      {" · "}
                      {g.total} {g.total === 1 ? "item" : "items"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Right: selected meeting's items */}
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    className="truncate text-[16px] font-semibold"
                    style={BG}
                  >
                    {selectedGroup?.title ?? "Select a meeting"}
                  </h2>
                  {selectedId && (
                    <Button
                      render={<Link href={`/dashboard/meetings/${selectedId}`} />}
                      nativeButton={false}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-muted-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {(selectedMeeting?.attendees?.length ?? 0) > 0 && (
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {selectedMeeting!.attendees!.join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Tabs
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v as "all" | "open" | "done")
                  }
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="px-3 text-[12px]">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="open" className="px-3 text-[12px]">
                      Open
                    </TabsTrigger>
                    <TabsTrigger value="done" className="px-3 text-[12px]">
                      Done
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-[12px]"
                      />
                    }
                  >
                    {ownerFilter === "all" ? "All owners" : ownerFilter}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-auto min-w-(--anchor-width)"
                  >
                    <DropdownMenuItem
                      className="cursor-pointer text-[12.5px]"
                      onClick={() => setOwnerFilter("all")}
                    >
                      All owners
                    </DropdownMenuItem>
                    {owners.map((o) => (
                      <DropdownMenuItem
                        key={o}
                        className="cursor-pointer text-[12.5px]"
                        onClick={() => setOwnerFilter(o)}
                      >
                        {o}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <Card
                className="flex items-center justify-center rounded-2xl py-16"
                style={CARD}
              >
                <p className="text-sm text-muted-foreground">
                  {meetingItems.length === 0
                    ? "No action items in this meeting."
                    : "Nothing matches these filters."}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <Card
                    key={item.id}
                    className="flex-row items-start gap-3 rounded-xl px-4 py-3"
                    style={CARD}
                  >
                    <button
                      onClick={() => toggleStatus(item)}
                      className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                      aria-label={
                        item.status === "open" ? "Mark as done" : "Mark as open"
                      }
                    >
                      {item.status === "done" ? (
                        <CheckCircle2
                          className="h-4.5 w-4.5"
                          style={{ color: "#4ade80" }}
                        />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-muted-foreground/50" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[13.5px] leading-snug ${item.status === "done"
                          ? "text-muted-foreground line-through"
                          : ""
                          }`}
                      >
                        {item.task}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                        <span style={MONO}>{item.owner}</span>
                        {item.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.deadline}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 gap-1.5 text-[11.5px]"
                          />
                        }
                      >
                        <UserPlus className="h-3 w-3" />
                        {item.assigned_to_name ??
                          item.assigned_to_email ??
                          "Assign"}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-auto min-w-52 max-w-80"
                      >
                        {attendeeOptions.length === 0 && (
                          <DropdownMenuItem disabled className="text-[12.5px]">
                            No attendees on this meeting
                          </DropdownMenuItem>
                        )}
                        {attendeeOptions.map((a) => (
                          <DropdownMenuItem
                            key={a.name}
                            className="cursor-pointer"
                            onClick={() => assignTo(item, a)}
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="text-[12.5px]">{a.name}</span>
                              <span className="break-all text-[10.5px] text-muted-foreground">
                                {a.email ?? "no email — won't be notified"}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                        {item.assigned_to_name && (
                          <DropdownMenuItem
                            className="cursor-pointer text-[12.5px] text-muted-foreground"
                            onClick={() => assignTo(item, null)}
                          >
                            Remove assignment
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
