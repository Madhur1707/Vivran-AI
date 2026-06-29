"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Users,
  FileText,
  CheckSquare,
  Lightbulb,
  HelpCircle,
  Loader2,
  Check,
  ArrowLeft,
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
  "#fbbf24",
  "#f97316",
  "#06b6d4",
];

interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface ActionItem {
  owner: string;
  task: string;
  deadline: string | null;
}

interface Decision {
  text: string;
  context: string | null;
}

interface Meeting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
  speaker_count: number | null;
  attendees: string[] | null;
  transcript: TranscriptSegment[] | null;
  summary: string | null;
  action_items: ActionItem[] | null;
  decisions: Decision[] | null;
  open_questions: string[] | null;
  follow_up_email: string | null;
  speakers_mapped: boolean | null;
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

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getSpeakerColor(speaker: string, allSpeakers: string[]): string {
  const idx = allSpeakers.indexOf(speaker);
  return AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAllSpeakerQuotes(transcript: TranscriptSegment[]) {
  const quotes: Record<string, string[]> = {};
  for (const seg of transcript) {
    if (seg.text.trim().length > 5) {
      if (!quotes[seg.speaker]) quotes[seg.speaker] = [];
      quotes[seg.speaker].push(
        seg.text.length > 120 ? seg.text.slice(0, 120) + "…" : seg.text
      );
    }
  }
  for (const speaker of Object.keys(quotes)) {
    quotes[speaker].sort((a, b) => b.length - a.length);
  }
  return quotes;
}

function getUniqueSpeakers(transcript: TranscriptSegment[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const seg of transcript) {
    if (!seen.has(seg.speaker)) {
      seen.add(seg.speaker);
      result.push(seg.speaker);
    }
  }
  return result;
}

/* ═══ Speaker Mapping UI ═══ */
function SpeakerMappingUI({
  transcript,
  attendees,
  meetingId,
  onMapped,
}: {
  transcript: TranscriptSegment[];
  attendees: string[];
  meetingId: string;
  onMapped: (updated: TranscriptSegment[]) => void;
}) {
  const allQuotes = getAllSpeakerQuotes(transcript);
  const speakers = Object.keys(allQuotes);
  const allSpeakers = getUniqueSpeakers(transcript);
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of speakers) {
      initial[s] = "";
    }
    return initial;
  });
  const [quoteIndex, setQuoteIndex] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const s of speakers) {
      initial[s] = 0;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const usedAttendees = new Set(Object.values(mapping).filter(Boolean));

  function shuffleQuote(speaker: string) {
    const quotes = allQuotes[speaker];
    if (!quotes || quotes.length <= 1) return;
    setQuoteIndex((prev) => ({
      ...prev,
      [speaker]: (prev[speaker] + 1) % quotes.length,
    }));
  }

  async function handleSave() {
    const speakerMap: Record<string, string> = {};
    for (const [speaker, attendee] of Object.entries(mapping)) {
      if (attendee) speakerMap[speaker] = attendee;
    }
    if (Object.keys(speakerMap).length === 0) return;

    setSaving(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/remap-speakers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, speaker_map: speakerMap }),
      });
      if (!res.ok) throw new Error("Failed to save");

      const updated = transcript.map((seg) => ({
        ...seg,
        speaker: speakerMap[seg.speaker] || seg.speaker,
      }));
      onMapped(updated);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const allAssigned = speakers.every((s) => mapping[s]);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(99,102,241,0.25)",
        background:
          "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)",
      }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(99,102,241,0.15)" }}
      >
        <div>
          <h3 className="text-[15px] font-semibold" style={BG}>
            Identify speakers
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            We detected {speakers.length} voice
            {speakers.length > 1 ? "s" : ""}. Read the quotes and match each to
            the right person.
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(99,102,241,0.1)" }}
        >
          <Users className="h-3 w-3" style={{ color: "#818cf8" }} />
          <span
            className="text-[11px] font-medium"
            style={{ color: "#818cf8", ...MONO }}
          >
            {Object.values(mapping).filter(Boolean).length}/{speakers.length}{" "}
            mapped
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {speakers.map((speaker) => {
          const color = getSpeakerColor(speaker, allSpeakers);
          const quotes = allQuotes[speaker] ?? [];
          const currentQuote = quotes[quoteIndex[speaker] ?? 0] ?? "";
          const hasMultipleQuotes = quotes.length > 1;
          return (
            <div
              key={speaker}
              className="rounded-xl border p-4"
              style={{
                borderColor: mapping[speaker]
                  ? `${color}40`
                  : "rgba(255,255,255,0.07)",
                background: mapping[speaker]
                  ? `${color}08`
                  : "rgba(255,255,255,0.02)",
                transition: "all 0.2s",
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: `${color}20`,
                    color: color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {mapping[speaker]
                    ? getInitials(mapping[speaker])
                    : speaker.replace("Speaker ", "#")}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color }}
                  >
                    {mapping[speaker] || speaker}
                  </span>
                  <div className="mt-1.5 flex items-start gap-2">
                    <p className="text-[12px] text-muted-foreground italic leading-snug flex-1">
                      &ldquo;{currentQuote}&rdquo;
                    </p>
                    {hasMultipleQuotes && (
                      <button
                        type="button"
                        onClick={() => shuffleQuote(speaker)}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
                        style={{
                          background: "rgba(99,102,241,0.1)",
                          color: "#818cf8",
                        }}
                        title="Show a different quote"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 2v6h-6" />
                          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                          <path d="M3 22v-6h6" />
                          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                        {(quoteIndex[speaker] ?? 0) + 1}/{quotes.length}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-11">
                {attendees.map((attendee) => {
                  const isSelected = mapping[speaker] === attendee;
                  const isUsed = usedAttendees.has(attendee) && !isSelected;
                  return (
                    <button
                      key={attendee}
                      disabled={isUsed}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                      style={{
                        background: isSelected
                          ? `${color}20`
                          : "rgba(255,255,255,0.05)",
                        color: isSelected ? color : "rgba(161,161,170,0.7)",
                        border: `1px solid ${isSelected ? `${color}40` : "rgba(255,255,255,0.08)"}`,
                        opacity: isUsed ? 0.3 : 1,
                        cursor: isUsed ? "not-allowed" : "pointer",
                      }}
                      onClick={() => {
                        if (isUsed) return;
                        setMapping((prev) => ({
                          ...prev,
                          [speaker]: isSelected ? "" : attendee,
                        }));
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {attendee}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="px-5 pb-5"
      >
        <Button
          className="w-full rounded-xl text-white border-0 py-5"
          disabled={!allAssigned || saving}
          style={{
            background: allAssigned
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "rgba(99,102,241,0.2)",
            boxShadow: allAssigned
              ? "0 0 20px rgba(99,102,241,0.25)"
              : "none",
          }}
          onClick={handleSave}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm speaker names
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ═══ Transcript View ═══ */
function TranscriptView({ transcript }: { transcript: TranscriptSegment[] }) {
  const allSpeakers = getUniqueSpeakers(transcript);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span className="text-[13px] font-semibold" style={BG}>
          Transcript
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
          <span className="text-[11px]" style={{ color: "#34d399", ...MONO }}>
            {allSpeakers.length} speaker{allSpeakers.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {transcript.map((seg, i) => {
          const color = getSpeakerColor(seg.speaker, allSpeakers);
          return (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: `${color}20`,
                    color: color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {getInitials(seg.speaker)}
                </div>
                {i < transcript.length - 1 && (
                  <div
                    className="w-px flex-1 min-h-3"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                )}
              </div>
              <div className="pb-1 flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color }}
                  >
                    {seg.speaker}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ ...MONO, color: "rgba(161,161,170,0.4)" }}
                  >
                    {formatTimestamp(seg.start)}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {seg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Main Component ═══ */
export function MeetingDetail({ meeting: initial }: { meeting: Meeting }) {
  const [meeting, setMeeting] = useState<Meeting>(initial);

  useEffect(() => {
    if (meeting.status === "completed" || meeting.status === "failed") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`meeting-${meeting.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meeting.id}`,
        },
        (payload) => {
          setMeeting(payload.new as Meeting);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meeting.id, meeting.status]);

  const st = statusConfig[meeting.status] ?? statusConfig.queued;

  const needsSpeakerMapping =
    meeting.status === "completed" &&
    meeting.transcript &&
    meeting.transcript.length > 0 &&
    !meeting.speakers_mapped &&
    meeting.attendees &&
    meeting.attendees.length > 0;

  function handleSpeakersMapped(updated: TranscriptSegment[]) {
    setMeeting((prev) => ({
      ...prev,
      transcript: updated,
      speakers_mapped: true,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to meetings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[clamp(22px,3vw,28px)] font-bold tracking-tight"
            style={BG}
          >
            {meeting.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-[12px] text-muted-foreground">
            <span style={MONO}>
              {new Date(meeting.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {meeting.duration_seconds && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor(meeting.duration_seconds / 60)}m{" "}
                  {meeting.duration_seconds % 60}s
                </span>
              </>
            )}
            {meeting.attendees && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {meeting.attendees.join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
          style={{ background: st.bg }}
        >
          {meeting.status === "processing" ? (
            <Loader2
              className="h-3 w-3 animate-spin"
              style={{ color: st.color }}
            />
          ) : (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: st.dot }}
            />
          )}
          <span
            className="text-[11px] font-medium"
            style={{ color: st.color, ...MONO }}
          >
            {st.label}
          </span>
        </div>
      </div>

      {/* Content */}
      {meeting.status === "queued" || meeting.status === "processing" ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{
            borderColor: "rgba(99,102,241,0.15)",
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%)",
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "#818cf8" }}
            />
          </div>
          <h3 className="text-lg font-semibold mb-1" style={BG}>
            {meeting.status === "queued"
              ? "Waiting in queue..."
              : "Processing your meeting..."}
          </h3>
          <p className="text-sm text-muted-foreground">
            {meeting.status === "queued"
              ? "Your meeting will be processed shortly"
              : "Transcribing audio and identifying speakers"}
          </p>
        </div>
      ) : meeting.status === "failed" ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{
            borderColor: "rgba(239,68,68,0.2)",
            background:
              "linear-gradient(180deg, rgba(239,68,68,0.04) 0%, transparent 100%)",
          }}
        >
          <h3
            className="text-lg font-semibold mb-1"
            style={{ ...BG, color: "#f87171" }}
          >
            Processing failed
          </h3>
          <p className="text-sm text-muted-foreground">
            Something went wrong. Please try uploading again.
          </p>
        </div>
      ) : (
        <>
          {needsSpeakerMapping && (
            <SpeakerMappingUI
              transcript={meeting.transcript!}
              attendees={meeting.attendees!}
              meetingId={meeting.id}
              onMapped={handleSpeakersMapped}
            />
          )}

          <Tabs defaultValue="transcript">
            <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0">
              {[
                { value: "transcript", label: "Transcript", icon: FileText },
                { value: "summary", label: "Summary", icon: Lightbulb },
                { value: "actions", label: "Action Items", icon: CheckSquare },
                { value: "questions", label: "Questions", icon: HelpCircle },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#6366f1] data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-[13px]"
                >
                  <tab.icon className="mr-2 h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="transcript" className="mt-5">
              {meeting.transcript && meeting.transcript.length > 0 ? (
                <TranscriptView transcript={meeting.transcript} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No transcript available yet.
                </p>
              )}
            </TabsContent>

            <TabsContent value="summary" className="mt-5">
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="p-6">
                  {meeting.summary ? (
                    <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {meeting.summary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No summary available yet.
                    </p>
                  )}

                  {meeting.decisions && meeting.decisions.length > 0 && (
                    <>
                      <Separator className="my-5 opacity-20" />
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
                        style={{ color: "#818cf8", ...MONO }}
                      >
                        Decisions Made
                      </p>
                      <div className="space-y-2.5">
                        {meeting.decisions.map((d, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                              style={{ background: "#818cf8" }}
                            />
                            <p className="text-[13px] text-muted-foreground leading-relaxed">
                              {d.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {meeting.follow_up_email && (
                    <>
                      <Separator className="my-5 opacity-20" />
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
                        style={{ color: "#818cf8", ...MONO }}
                      >
                        Follow-up Email Draft
                      </p>
                      <div
                        className="rounded-xl p-4"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <pre
                          className="whitespace-pre-wrap text-[13px] text-muted-foreground leading-relaxed"
                          style={MONO}
                        >
                          {meeting.follow_up_email}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="mt-5">
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {meeting.action_items && meeting.action_items.length > 0 ? (
                  <div className="p-4 space-y-2.5">
                    {meeting.action_items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
                        style={{
                          borderColor: "rgba(255,255,255,0.07)",
                          background: "rgba(255,255,255,0.025)",
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                          style={{
                            background: "rgba(99,102,241,0.15)",
                            color: "#818cf8",
                          }}
                        >
                          {getInitials(item.owner)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className="text-[12px] font-semibold"
                              style={{ color: "#818cf8" }}
                            >
                              {item.owner}
                            </span>
                            {item.deadline && (
                              <span
                                className="text-[10px] shrink-0"
                                style={{
                                  color: "rgba(161,161,170,0.5)",
                                  ...MONO,
                                }}
                              >
                                {item.deadline}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-muted-foreground leading-snug">
                            {item.task}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No action items extracted yet.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="questions" className="mt-5">
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {meeting.open_questions && meeting.open_questions.length > 0 ? (
                  <div className="p-5 space-y-3">
                    {meeting.open_questions.map((q, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 text-[13px]"
                      >
                        <HelpCircle
                          className="h-4 w-4 shrink-0 mt-0.5"
                          style={{ color: "rgba(161,161,170,0.4)" }}
                        />
                        <span className="text-muted-foreground">{q}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No open questions found.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
