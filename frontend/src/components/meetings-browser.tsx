"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Users,
  ChevronRight,
  Search,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

interface Meeting {
  id: string;
  title: string;
  status: "queued" | "processing" | "completed" | "failed";
  duration_seconds: number | null;
  speaker_count: number | null;
  attendees: string[] | null;
  created_at: string;
}

const statusConfig: Record<
  string,
  { label: string; dot: string; bg: string; color: string }
> = {
  queued: {
    label: "Queued",
    dot: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    color: "#fbbf24",
  },
  processing: {
    label: "Processing",
    dot: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    color: "#60a5fa",
  },
  completed: {
    label: "Completed",
    dot: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    color: "#34d399",
  },
  failed: {
    label: "Failed",
    dot: "#f87171",
    bg: "rgba(239,68,68,0.1)",
    color: "#f87171",
  },
};

const AVATAR_COLORS = [
  "#818cf8",
  "#f472b6",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#f97316",
  "#06b6d4",
  "#f87171",
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest duration" },
  { value: "speakers", label: "Most speakers" },
  { value: "title", label: "Title A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MeetingsBrowser({ meetings }: { meetings: Meeting[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortValue>("newest");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: meetings.length };
    for (const m of meetings) {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    }
    return counts;
  }, [meetings]);

  const filtered = useMemo(() => {
    let result = meetings;

    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((m) => {
        const titleMatch = m.title.toLowerCase().includes(q);
        const attendeeMatch = (m.attendees ?? []).some((a) =>
          a.toLowerCase().includes(q)
        );
        return titleMatch || attendeeMatch;
      });
    }

    const sorted = [...result];
    switch (sort) {
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "longest":
        sorted.sort(
          (a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0)
        );
        break;
      case "speakers":
        sorted.sort(
          (a, b) => (b.speaker_count ?? 0) - (a.speaker_count ?? 0)
        );
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return sorted;
  }, [meetings, statusFilter, query, sort]);

  const sortLabel =
    SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Newest first";

  const visibleStatusOptions = useMemo(
    () =>
      STATUS_OPTIONS.filter(
        (opt) => opt.value === "all" || (statusCounts[opt.value] ?? 0) > 0
      ),
    [statusCounts]
  );

  const activeStatusOption =
    visibleStatusOptions.find((opt) => opt.value === statusFilter) ??
    STATUS_OPTIONS[0];
  const activeStatusLabel = `${activeStatusOption.label} (${statusCounts[activeStatusOption.value] ?? 0
    })`;

  return (
    <div className="space-y-4">
      {/* Toolbar — filters, search (fills remaining space) and sort in one row */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        {/* Status filter chips — desktop only */}
        <div className="hidden lg:flex flex-wrap items-center gap-1.5 shrink-0">
          {visibleStatusOptions.map((opt) => {
            const count = statusCounts[opt.value] ?? 0;
            const isActive = statusFilter === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                onClick={() => setStatusFilter(opt.value)}
                className="text-[11px] font-medium cursor-pointer"
              >
                {opt.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Search — fills remaining space */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 pointer-events-none" />
          <Input
            placeholder="Search meetings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 pr-7 text-[12px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter (mobile) + Sort — share a row on mobile, unwrap into the toolbar row on desktop */}
        <div className="flex items-center gap-2 lg:contents">
          {/* Status filter dropdown — mobile only */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "cursor-pointer text-[11px] font-medium gap-1.5 flex-1 lg:hidden justify-center"
              )}
            >
              <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{activeStatusLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-auto">
              {visibleStatusOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    "cursor-pointer text-[12px]",
                    statusFilter === opt.value &&
                    "bg-accent text-accent-foreground"
                  )}
                >
                  {opt.label} ({statusCounts[opt.value] ?? 0})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "cursor-pointer text-[11px] font-medium gap-1.5 flex-1 lg:w-30 lg:flex-none justify-center"
              )}
            >
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{sortLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-auto">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={cn(
                    "cursor-pointer text-[12px]",
                    sort === opt.value && "bg-accent text-accent-foreground"
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Results count */}
      {(query || statusFilter !== "all") && (
        <p className="text-[12px] text-muted-foreground">
          {filtered.length} of {meetings.length} meeting
          {meetings.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grid / empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-foreground/10 bg-foreground/2">
          <Search className="h-5 w-5 mb-2.5 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            No meetings match your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((meeting) => {
            const st = statusConfig[meeting.status] ?? statusConfig.queued;
            const attendeeNames = meeting.attendees ?? [];
            return (
              <Link key={meeting.id} href={`/dashboard/meetings/${meeting.id}`}>
                <div className="group rounded-xl border border-border bg-card p-4 h-full flex flex-col transition-all duration-200 hover:border-foreground/30 hover:shadow-lg shadow-sm cursor-pointer">
                  {/* Top: Status + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                      style={{ background: st.bg }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: st.dot }}
                      />
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: st.color, ...MONO }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <span
                      className="text-[10px] text-muted-foreground"
                      style={MONO}
                    >
                      {formatDate(meeting.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-[14px] font-semibold text-foreground mb-1 line-clamp-2 leading-snug"
                    style={BG}
                  >
                    {meeting.title}
                  </h3>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-1.5 mb-3 text-[11px] text-muted-foreground">
                    {meeting.duration_seconds != null &&
                      meeting.duration_seconds > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatDuration(meeting.duration_seconds)}
                        </span>
                      )}
                    {meeting.speaker_count != null &&
                      meeting.speaker_count > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 shrink-0" />
                          {meeting.speaker_count} speakers
                        </span>
                      )}
                  </div>

                  <div className="flex-1" />

                  {/* Bottom: Avatars + arrow */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    {attendeeNames.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {attendeeNames.slice(0, 4).map((name, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-background"
                              style={{
                                background: `${AVATAR_COLORS[i % AVATAR_COLORS.length]}20`,
                                color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                              }}
                            >
                              {getInitials(name)}
                            </div>
                          ))}
                          {attendeeNames.length > 4 && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-medium ring-2 ring-background bg-foreground/10 text-muted-foreground">
                              +{attendeeNames.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                          {attendeeNames.slice(0, 2).join(", ")}
                          {attendeeNames.length > 2 &&
                            ` +${attendeeNames.length - 2}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        No attendees
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground/70 transition-colors shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
