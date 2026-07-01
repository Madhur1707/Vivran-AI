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
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const AVATAR_COLORS = ["#e4e4e7", "#a1a1aa", "#f472b6", "#34d399", "#d4d4d8"];

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
  meeting_title?: string;
  meeting_id?: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function SearchPage() {
  const [scope, setScope] = useState<"single" | "all">("all");
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingOption | null>(null);
  const [meetingFilter, setMeetingFilter] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .single();
        setWorkspaceId(membership?.workspace_id ?? null);
      }
    }
    loadMeetings();
  }, []);

  function resetSearch() {
    setHasSearched(false);
    setAnswer("");
    setSources([]);
  }

  function selectMeeting(m: MeetingOption | null) {
    setSelectedMeeting(m);
    resetSearch();
  }

  function selectScope(s: "single" | "all") {
    setScope(s);
    if (s === "all") setSelectedMeeting(null);
    resetSearch();
  }

  const activeMeeting = scope === "single" ? selectedMeeting : null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    if (scope === "single" && !activeMeeting) return;
    if (scope === "all" && !workspaceId) return;

    setSearching(true);
    setHasSearched(true);
    setAnswer("");
    setSources([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const endpoint = activeMeeting ? "/api/search" : "/api/search-all";
      const body = activeMeeting
        ? { meeting_id: activeMeeting.id, query: query.trim() }
        : { workspace_id: workspaceId, query: query.trim() };

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const filteredMeetings = meetings.filter((m) =>
    meetingFilter
      ? m.title.toLowerCase().includes(meetingFilter.toLowerCase()) ||
        (m.attendees ?? []).some((a) => a.toLowerCase().includes(meetingFilter.toLowerCase()))
      : true
  );

  return (
    <div
      className="flex flex-col md:flex-row w-full md:min-h-[75vh]"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* LEFT: scope tabs + compact meetings list */}
      <div
        className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r px-3 py-4 md:py-5 flex flex-col"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* Scope tabs */}
        <div
          className="flex rounded-full border p-0.5 mb-3"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        >
          {(
            [
              { key: "single", label: "Select meeting" },
              { key: "all", label: "All meetings" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => selectScope(opt.key)}
              className="flex-1 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer"
              style={{
                background: scope === opt.key ? "rgba(255,255,255,0.15)" : "transparent",
                color: scope === opt.key ? "#e4e4e7" : "#71717a",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {scope === "single" && (
          <>
            {meetings.length > 6 && (
              <div
                className="flex items-center gap-2 rounded-lg border px-2.5 mb-2"
                style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
              >
                <Search className="h-3 w-3 shrink-0" style={{ color: "rgba(161,161,170,0.4)" }} />
                <input
                  placeholder="Filter…"
                  value={meetingFilter}
                  onChange={(e) => setMeetingFilter(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/40"
                />
                {meetingFilter && (
                  <button onClick={() => setMeetingFilter("")} className="text-[10px] text-muted-foreground hover:text-foreground">
                    ✕
                  </button>
                )}
              </div>
            )}

            <div className="max-h-56 md:max-h-none md:flex-1 overflow-y-auto space-y-1 min-h-0">
              {filteredMeetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMeeting(isSelected ? null : m)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150"
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.1)" : "transparent",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[9px] font-bold"
                      style={{
                        background: isSelected ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                        color: isSelected ? "#e4e4e7" : "#71717a",
                      }}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : getInitials(m.title)}
                    </div>
                    <span
                      className="text-[12px] font-medium truncate"
                      style={{ ...BG, color: isSelected ? "#e4e4e7" : "#a1a1aa" }}
                    >
                      {m.title}
                    </span>
                  </button>
                );
              })}
              {filteredMeetings.length === 0 && meetingFilter && (
                <p className="text-center text-[11px] text-muted-foreground py-3 px-2">
                  No matches for &ldquo;{meetingFilter}&rdquo;
                </p>
              )}
              {meetings.length === 0 && (
                <div className="flex flex-col items-center py-8 gap-2 px-2 text-center">
                  <FileText className="h-5 w-5" style={{ color: "rgba(161,161,170,0.25)" }} />
                  <p className="text-[11px] text-muted-foreground">
                    No meetings yet.{" "}
                    <Link href="/dashboard/upload" className="underline" style={{ color: "#a1a1aa" }}>Upload one</Link>
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {scope === "all" && (
          <div className="flex flex-col items-center py-6 gap-2 px-2 text-center">
            <Sparkles className="h-5 w-5" style={{ color: "rgba(161,161,170,0.3)" }} />
            <p className="text-[11px] text-muted-foreground">
              Searching across all {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>

      {/* RIGHT: search input + results */}
      <div className="flex-1 px-4 md:px-6 py-5 md:py-6 space-y-5 min-w-0">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "#52525b", ...MONO }}>
            Search
          </p>
          <p className="text-[14px] font-semibold mt-0.5" style={{ color: "#e4e4e7", ...BG }}>
            {activeMeeting ? activeMeeting.title : "All meetings"}
          </p>
        </div>

        <form onSubmit={handleSearch}>
          <div
            className="flex items-center gap-2.5 rounded-2xl border px-4 py-0.5 transition-all focus-within:border-white/30"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              placeholder={
                scope === "single"
                  ? activeMeeting
                    ? "Ask about this meeting…"
                    : "Select a meeting first…"
                  : "Ask anything across all meetings…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={scope === "single" && !activeMeeting}
              className="flex-1 min-w-0 bg-transparent py-3 text-[13px] outline-none placeholder:text-muted-foreground/30 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={searching || !query.trim() || (scope === "single" && !activeMeeting)}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: query.trim() ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)",
                color: query.trim() ? "#0a0a0a" : "#52525b",
              }}
            >
              {searching
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </form>

        {/* Results */}
        {!hasSearched && (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Search className="h-5 w-5" style={{ color: "rgba(161,161,170,0.25)" }} />
            <p className="text-[13px] text-muted-foreground">
              {scope === "single"
                ? activeMeeting
                  ? "Ask a question about this meeting"
                  : "Select a meeting on the left to search within it"
                : "Ask a question across every meeting in your workspace"}
            </p>
          </div>
        )}

        {searching && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(161,161,170,0.35)" }} />
            <p className="text-[13px] text-muted-foreground">Searching…</p>
          </div>
        )}

        {answer && !searching && (
          <>
            {/* AI Answer */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: "3px solid rgba(255,255,255,0.3)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5" style={{ color: "#a1a1aa" }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#71717a", ...MONO }}>
                  AI Answer
                </p>
              </div>
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground">
                {answer}
              </p>
            </div>

            {/* Sources */}
            {sources.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="px-5 py-3 flex items-center justify-between border-b"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#52525b", ...MONO }}>
                    Sources
                  </p>
                  <span className="text-[10px]" style={{ color: "#3f3f46", ...MONO }}>
                    {sources.length} quote{sources.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {sources.map((s, i) => {
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="shrink-0 flex flex-col items-center gap-1">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
                          >
                            {getInitials(s.speaker)}
                          </div>
                          {i < sources.length - 1 && (
                            <div className="w-px flex-1 min-h-3" style={{ background: "rgba(255,255,255,0.04)" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                            <span className="text-[12px] font-semibold" style={{ color }}>
                              {s.speaker}
                            </span>
                            <span className="text-[10px]" style={{ color: "#3f3f46", ...MONO }}>
                              {formatTimestamp(s.timestamp)}
                            </span>
                            {!activeMeeting && s.meeting_title && (
                              <Link
                                href={s.meeting_id ? `/dashboard/meetings/${s.meeting_id}` : "#"}
                                className="text-[10px] font-medium hover:underline"
                                style={{ color: "#71717a" }}
                              >
                                {s.meeting_title}
                              </Link>
                            )}
                          </div>
                          <p className="text-[13px] leading-relaxed italic" style={{ color: "#71717a" }}>
                            &ldquo;{s.text}&rdquo;
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {activeMeeting && (
                  <div className="px-5 py-3 border-t flex justify-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <Link
                      href={`/dashboard/meetings/${activeMeeting.id}`}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: "#a1a1aa" }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      View full transcript
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {hasSearched && !searching && !answer && (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Search className="h-5 w-5" style={{ color: "rgba(161,161,170,0.25)" }} />
            <p className="text-[13px] text-muted-foreground">No results found. Try rephrasing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
