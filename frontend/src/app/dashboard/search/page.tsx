"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Loader2,
  FileText,
  MessageSquare,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

const AVATAR_COLORS = [
  "#6366f1",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#818cf8",
];

interface MeetingOption {
  id: string;
  title: string;
  created_at: string;
  attendees: string[] | null;
}

interface Source {
  speaker: string;
  text: string;
  timestamp: number;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SearchPage() {
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [selectedMeeting, setSelectedMeeting] =
    useState<MeetingOption | null>(null);
  const [meetingFilter, setMeetingFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function loadMeetings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("meetings")
        .select("id, title, created_at, attendees")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      setMeetings(data ?? []);
    }
    loadMeetings();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !selectedMeeting) return;

    setSearching(true);
    setHasSearched(true);
    setAnswer("");
    setSources([]);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: selectedMeeting.id,
          query: query.trim(),
        }),
      });

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
    } catch {
      setAnswer("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="text-center pt-4">
        <h1
          className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight"
          style={BG}
        >
          Search your meetings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a meeting, ask a question, get an instant answer
        </p>
      </div>

      {/* Step 1: Pick a meeting */}
      <div>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-2"
          style={{ color: selectedMeeting ? "#34d399" : "#818cf8", ...MONO }}
        >
          {selectedMeeting ? (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.15)" }}
            >
              <Check className="h-2.5 w-2.5" style={{ color: "#34d399" }} />
            </span>
          ) : (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#818cf8",
              }}
            >
              1
            </span>
          )}
          {selectedMeeting ? "Meeting selected" : "Select a meeting"}
        </p>

        {meetings.length > 4 && (
          <div
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 mb-3"
          >
            <Search
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "rgba(161,161,170,0.4)" }}
            />
            <input
              placeholder="Filter meetings..."
              value={meetingFilter}
              onChange={(e) => {
                setMeetingFilter(e.target.value);
                setShowAll(false);
              }}
              className="flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-muted-foreground/40"
            />
            {meetingFilter && (
              <button
                onClick={() => setMeetingFilter("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {(() => {
          const filtered = meetings.filter((m) =>
            meetingFilter
              ? m.title.toLowerCase().includes(meetingFilter.toLowerCase()) ||
                (m.attendees ?? []).some((a) =>
                  a.toLowerCase().includes(meetingFilter.toLowerCase())
                )
              : true
          );
          const LIMIT = 6;
          const visible = showAll ? filtered : filtered.slice(0, LIMIT);
          const hasMore = filtered.length > LIMIT;

          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visible.map((m) => {
                  const isSelected = selectedMeeting?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMeeting(isSelected ? null : m);
                        if (!isSelected) {
                          setHasSearched(false);
                          setAnswer("");
                          setSources([]);
                        }
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200"
                      style={{
                        borderColor: isSelected
                          ? "rgba(99,102,241,0.4)"
                          : undefined,
                        background: isSelected
                          ? "rgba(99,102,241,0.08)"
                          : undefined,
                        boxShadow: isSelected
                          ? "0 0 0 1px rgba(99,102,241,0.2)"
                          : undefined,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: isSelected
                            ? "rgba(99,102,241,0.2)"
                            : "rgba(99,102,241,0.08)",
                        }}
                      >
                        {isSelected ? (
                          <Check
                            className="h-4 w-4"
                            style={{ color: "#818cf8" }}
                          />
                        ) : (
                          <FileText
                            className="h-4 w-4"
                            style={{ color: "#818cf8" }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-semibold truncate"
                          style={{
                            ...BG,
                            color: isSelected ? "#818cf8" : undefined,
                          }}
                        >
                          {m.title}
                        </p>
                        <p
                          className="text-[10px] text-muted-foreground truncate"
                          style={MONO}
                        >
                          {new Date(m.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                          {m.attendees &&
                            m.attendees.length > 0 &&
                            ` · ${m.attendees.slice(0, 3).join(", ")}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {hasMore && !meetingFilter && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full mt-2 py-2 text-[12px] font-medium rounded-lg transition-colors hover:opacity-80"
                  style={{ color: "#818cf8" }}
                >
                  {showAll
                    ? "Show less"
                    : `Show ${filtered.length - LIMIT} more meeting${filtered.length - LIMIT > 1 ? "s" : ""}`}
                </button>
              )}

              {filtered.length === 0 && meetingFilter && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No meetings matching &ldquo;{meetingFilter}&rdquo;
                </p>
              )}
            </>
          );
        })()}

        {meetings.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl border"
            style={{
              borderColor: "rgba(99,102,241,0.1)",
              background: "rgba(99,102,241,0.03)",
            }}
          >
            <FileText
              className="h-6 w-6 mb-3"
              style={{ color: "rgba(161,161,170,0.3)" }}
            />
            <p className="text-sm text-muted-foreground">
              No completed meetings yet.{" "}
              <Link
                href="/dashboard/upload"
                className="font-medium"
                style={{ color: "#818cf8" }}
              >
                Upload one
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Ask a question */}
      <div
        style={{
          opacity: selectedMeeting ? 1 : 0.4,
          pointerEvents: selectedMeeting ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3 flex items-center gap-2"
          style={{
            color:
              hasSearched && answer ? "#34d399" : "#818cf8",
            ...MONO,
          }}
        >
          {hasSearched && answer ? (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.15)" }}
            >
              <Check className="h-2.5 w-2.5" style={{ color: "#34d399" }} />
            </span>
          ) : (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#818cf8",
              }}
            >
              2
            </span>
          )}
          Ask a question
        </p>

        <form onSubmit={handleSearch}>
          <div
            className="flex items-center gap-3 rounded-2xl border px-5 py-1 shadow-sm transition-all focus-within:shadow-md"
            style={{
              borderColor: "rgba(99,102,241,0.2)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <Search
              className="h-5 w-5 shrink-0"
              style={{ color: "rgba(99,102,241,0.4)" }}
            />
            <input
              placeholder={
                selectedMeeting
                  ? `What do you want to know about "${selectedMeeting.title}"?`
                  : "Select a meeting first..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!selectedMeeting}
              className="flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background:
                  query.trim()
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "rgba(99,102,241,0.1)",
                color: query.trim() ? "white" : "#818cf8",
                opacity: query.trim() ? 1 : 0.5,
              }}
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {answer && (
        <div className="space-y-4">
          {/* AI Answer */}
          <div
            className="rounded-2xl border-l-2 p-5"
            style={{
              borderColor: "#6366f1",
              background: "rgba(99,102,241,0.06)",
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
              style={{ color: "#818cf8", ...MONO }}
            >
              AI Answer
            </p>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: "rgba(161,161,170,0.5)", ...MONO }}
                >
                  Sources
                </p>
                <span
                  className="text-[10px]"
                  style={{ color: "rgba(161,161,170,0.4)", ...MONO }}
                >
                  {sources.length} quote{sources.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {sources.map((s, i) => {
                  const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: `${color}20`,
                            color: color,
                            border: `1px solid ${color}30`,
                          }}
                        >
                          {getInitials(s.speaker)}
                        </div>
                        {i < sources.length - 1 && (
                          <div
                            className="w-px flex-1 min-h-3"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                            }}
                          />
                        )}
                      </div>
                      <div className="pb-1 flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span
                            className="text-[12px] font-semibold"
                            style={{ color }}
                          >
                            {s.speaker}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{
                              ...MONO,
                              color: "rgba(161,161,170,0.4)",
                            }}
                          >
                            {formatTimestamp(s.timestamp)}
                          </span>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed italic">
                          &ldquo;{s.text}&rdquo;
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedMeeting && (
                <div
                  className="px-5 py-3 border-t flex items-center justify-center"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <Link
                    href={`/dashboard/meetings/${selectedMeeting.id}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
                    style={{ color: "#818cf8" }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    View full transcript
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {hasSearched && !searching && !answer && (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl border"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Search
            className="h-6 w-6 mb-3"
            style={{ color: "rgba(161,161,170,0.3)" }}
          />
          <p className="text-sm text-muted-foreground">
            No results found. Try rephrasing your question.
          </p>
        </div>
      )}
    </div>
  );
}
