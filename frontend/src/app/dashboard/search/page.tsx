"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Loader2,
  FileText,
  MessageSquare,
  ArrowRight,
  Check,
  Sparkles,
  Mic,
  Square,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchAllMeetings,
  searchMeeting,
  voiceSearch,
  type SearchSource,
} from "@/services/search-service";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const AVATAR_COLORS = ["#e4e4e7", "#a1a1aa", "#f472b6", "#34d399", "#d4d4d8"];

interface MeetingOption {
  id: string;
  title: string;
  created_at: string;
  attendees: string[] | null;
}

type Source = SearchSource;

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
  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
      const data = activeMeeting
        ? await searchMeeting({ meetingId: activeMeeting.id, query: query.trim() })
        : await searchAllMeetings({ workspaceId: workspaceId!, query: query.trim() });
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
    } catch (err) {
      const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
      setAnswer(`Something went wrong. Please try again.${detail}`);
    } finally {
      setSearching(false);
    }
  }

  const voiceDisabled = (scope === "single" && !activeMeeting) || (scope === "all" && !workspaceId);

  async function startRecording() {
    if (voiceDisabled || recording || voiceLoading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        handleVoiceQuery(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setHasSearched(true);
      setAnswer("Couldn't access your microphone. Check your browser's mic permissions and try again.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleVoiceQuery(blob: Blob) {
    setVoiceLoading(true);
    setHasSearched(true);
    setAnswer("");
    setSources([]);

    try {
      const data = await voiceSearch({
        audioBlob: blob,
        meetingId: activeMeeting?.id,
        workspaceId: activeMeeting ? undefined : workspaceId ?? undefined,
      });
      setQuery(data.query_text ?? "");
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);

      if (data.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
        audio.play().catch(() => {});
      }
    } catch (err) {
      const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
      setAnswer(`Something went wrong. Please try again.${detail}`);
    } finally {
      setVoiceLoading(false);
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
            <Button
              key={opt.key}
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => selectScope(opt.key)}
              className="h-auto flex-1 rounded-full py-1.5 text-[11px] font-medium hover:bg-transparent"
              style={{
                background: scope === opt.key ? "rgba(255,255,255,0.15)" : "transparent",
                color: scope === opt.key ? "#e4e4e7" : "#71717a",
              }}
            >
              {opt.label}
            </Button>
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
                <Input
                  placeholder="Filter…"
                  value={meetingFilter}
                  onChange={(e) => setMeetingFilter(e.target.value)}
                  className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 py-1.5 text-[12px] shadow-none focus-visible:ring-0 dark:bg-transparent placeholder:text-muted-foreground/40"
                />
                {meetingFilter && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setMeetingFilter("")}
                    className="text-[10px] text-muted-foreground hover:bg-transparent hover:text-foreground"
                    aria-label="Clear filter"
                  >
                    ✕
                  </Button>
                )}
              </div>
            )}

            <div className="max-h-56 md:max-h-none md:flex-1 overflow-y-auto space-y-1 min-h-0">
              {filteredMeetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                return (
                  <Button
                    key={m.id}
                    variant="ghost"
                    onClick={() => selectMeeting(isSelected ? null : m)}
                    className="h-auto w-full justify-start gap-2 rounded-lg px-2.5 py-2 text-left font-normal"
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
                  </Button>
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
            <Input
              placeholder={
                scope === "single"
                  ? activeMeeting
                    ? "Ask about this meeting…"
                    : "Select a meeting first…"
                  : "Ask anything across all meetings…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={(scope === "single" && !activeMeeting) || recording || voiceLoading}
              className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 py-3 text-[13px] shadow-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent placeholder:text-muted-foreground/30"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={recording ? stopRecording : startRecording}
              disabled={voiceDisabled || voiceLoading}
              title={recording ? "Stop recording" : "Ask by voice"}
              className="shrink-0 rounded-lg"
              style={{
                background: recording ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.08)",
                color: recording ? "#ef4444" : "#a1a1aa",
              }}
            >
              {recording
                ? <Square className="h-3 w-3 fill-current" />
                : <Mic className="h-3.5 w-3.5" />}
            </Button>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              disabled={searching || voiceLoading || recording || !query.trim() || (scope === "single" && !activeMeeting)}
              className="shrink-0 rounded-lg"
              style={{
                background: query.trim() ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)",
                color: query.trim() ? "#0a0a0a" : "#52525b",
              }}
              aria-label="Search"
            >
              {searching
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </form>

        {recording && (
          <div className="flex items-center gap-2 -mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#ef4444" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#ef4444" }} />
            </span>
            <p className="text-[12px]" style={{ color: "#ef4444" }}>Listening… click the square to stop</p>
          </div>
        )}

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

        {(searching || voiceLoading) && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(161,161,170,0.35)" }} />
            <p className="text-[13px] text-muted-foreground">
              {voiceLoading ? "Transcribing, thinking, and preparing a spoken answer…" : "Searching…"}
            </p>
          </div>
        )}

        {answer && !searching && !voiceLoading && (
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

        {hasSearched && !searching && !voiceLoading && !answer && (
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
