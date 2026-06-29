import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Clock,
  Users,
  FileAudio,
  ChevronRight,
  CalendarDays,
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
    dot: "#818cf8",
    bg: "rgba(99,102,241,0.1)",
    color: "#818cf8",
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
  "#6366f1",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#818cf8",
  "#fbbf24",
  "#f97316",
  "#06b6d4",
];

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

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: meetings } = await supabase
    .from("meetings")
    .select(
      "id, title, status, duration_seconds, speaker_count, attendees, created_at"
    )
    .order("created_at", { ascending: false });

  const meetingList: Meeting[] = meetings ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight"
            style={BG}
          >
            Your meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meetingList.length} recording{meetingList.length !== 1 ? "s" : ""}{" "}
            processed
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button
            className="rounded-full text-white border-0"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 0 20px rgba(99,102,241,0.25)",
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload recording
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {meetingList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl border"
          style={{
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%)",
            borderColor: "rgba(99,102,241,0.15)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <FileAudio className="h-7 w-7" style={{ color: "#818cf8" }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={BG}>
            No meetings yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
            Upload your first meeting recording and get transcripts, action
            items, and insights in minutes
          </p>
          <Link href="/dashboard/upload">
            <Button
              className="rounded-full text-white border-0"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload your first recording
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetingList.map((meeting) => {
            const st = statusConfig[meeting.status] ?? statusConfig.queued;
            const attendeeNames = meeting.attendees ?? [];
            return (
              <Link
                key={meeting.id}
                href={`/dashboard/meetings/${meeting.id}`}
              >
                <div
                  className="group rounded-xl border border-border bg-card p-5 h-full flex flex-col transition-all duration-200 hover:border-[rgba(99,102,241,0.3)] hover:shadow-lg shadow-sm cursor-pointer"
                >
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
                    {meeting.duration_seconds != null && meeting.duration_seconds > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatDuration(meeting.duration_seconds)}
                      </span>
                    )}
                    {meeting.speaker_count != null && meeting.speaker_count > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 shrink-0" />
                        {meeting.speaker_count} speakers
                      </span>
                    )}
                  </div>

                  {/* Spacer to push bottom to end */}
                  <div className="flex-1" />

                  {/* Bottom: Avatars + arrow */}
                  <div
                    className="flex items-center justify-between pt-4 border-t border-border"
                  >
                    {attendeeNames.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {attendeeNames.slice(0, 4).map((name, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-background"
                              style={{
                                background: `${AVATAR_COLORS[i % AVATAR_COLORS.length]}20`,
                                color:
                                  AVATAR_COLORS[i % AVATAR_COLORS.length],
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#818cf8] transition-colors shrink-0" />
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
