"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Users,
  ChevronRight,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";

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
    dot: "#d4d4d8",
    bg: "rgba(255,255,255,0.1)",
    color: "#d4d4d8",
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
  "#e4e4e7",
  "#a1a1aa",
  "#f472b6",
  "#34d399",
  "#d4d4d8",
  "#fbbf24",
  "#f97316",
  "#06b6d4",
];

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
  const [sortOpen, setSortOpen] = useState(false);

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div
          className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <input
            placeholder="Search by title or attendee..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/40 min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-medium cursor-pointer hover:border-[rgba(255,255,255,0.25)] transition-colors w-full sm:w-auto"
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <span className="whitespace-nowrap">{sortLabel}</span>
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
              />
              <div
                className="absolute right-0 mt-1.5 w-44 rounded-xl border border-border bg-card overflow-hidden z-20 shadow-lg"
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSort(opt.value);
                      setSortOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] cursor-pointer transition-colors hover:bg-white/5"
                    style={{
                      background:
                        sort === opt.value
                          ? "rgba(255,255,255,0.06)"
                          : undefined,
                      color: sort === opt.value ? "#e4e4e7" : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "all", label: "All" },
          { value: "completed", label: "Completed" },
          { value: "processing", label: "Processing" },
          { value: "queued", label: "Queued" },
          { value: "failed", label: "Failed" },
        ].map((opt) => {
          const count = statusCounts[opt.value] ?? 0;
          if (opt.value !== "all" && count === 0) return null;
          const isActive = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer"
              style={{
                background: isActive
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(255,255,255,0.04)",
                color: isActive ? "#e4e4e7" : "#9999a8",
                border: `1px solid ${isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                ...MONO,
              }}
            >
              {opt.label} ({count})
            </button>
          );
        })}
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
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl border"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Search className="h-6 w-6 mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No meetings match your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((meeting) => {
            const st = statusConfig[meeting.status] ?? statusConfig.queued;
            const attendeeNames = meeting.attendees ?? [];
            return (
              <Link key={meeting.id} href={`/dashboard/meetings/${meeting.id}`}>
                <div className="group rounded-xl border border-border bg-card p-5 h-full flex flex-col transition-all duration-200 hover:border-[rgba(255,255,255,0.3)] hover:shadow-lg shadow-sm cursor-pointer">
                  {/* Top: Status + date */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
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
                      className="text-[11px] text-muted-foreground"
                      style={MONO}
                    >
                      {formatDate(meeting.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-[15px] font-semibold text-foreground mb-1 line-clamp-2 leading-snug"
                    style={BG}
                  >
                    {meeting.title}
                  </h3>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 mt-2 mb-5 text-[11px] text-muted-foreground">
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
                  <div className="flex items-center justify-between pt-4 border-t border-border">
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
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-medium ring-2 ring-background"
                              style={{
                                background: "rgba(161,161,170,0.1)",
                                color: "rgba(161,161,170,0.5)",
                              }}
                            >
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#d4d4d8] transition-colors shrink-0" />
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
