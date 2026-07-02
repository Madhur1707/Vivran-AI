"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CheckSquare,
  Clock,
  FileText,
  HelpCircle,
  Lightbulb,
  Loader2,
  Mail,
  Users,
} from "lucide-react";

import type { Meeting, TranscriptSegment } from "@/lib/meeting-types";
import { BG, MONO } from "@/lib/meeting-utils";

import { StatusBadge } from "@/components/meeting/status-badge";
import { ProcessingState, FailedState } from "@/components/meeting/processing-state";
import { SpeakerMappingUI } from "@/components/meeting/speaker-mapping-ui";
import { TranscriptView } from "@/components/meeting/transcript-view";
import { SummaryTab } from "@/components/meeting/summary-tab";
import { ActionItemsTab } from "@/components/meeting/action-items-tab";
import { QuestionsTab } from "@/components/meeting/questions-tab";
import { FollowUpEmailPanel } from "@/components/meeting/follow-up-email-panel";

function GeneratingPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 rounded-2xl border text-sm text-muted-foreground"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      Generating {label}...
    </div>
  );
}

export function MeetingDetail({ meeting: initial }: { meeting: Meeting }) {
  const [meeting, setMeeting] = useState<Meeting>(initial);

  const hasTranscript = !!meeting.transcript?.length;
  // Transcript is saved before analysis runs, so we can show it while the
  // summary/action items are still being generated.
  const isAnalyzing = meeting.status === "processing" && hasTranscript;

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
        () => {
          supabase
            .from("meetings")
            .select("*")
            .eq("id", meeting.id)
            .single()
            .then(({ data }) => {
              if (data) setMeeting(data as Meeting);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meeting.id, meeting.status]);

  const needsSpeakerMapping =
    meeting.status === "completed" &&
    meeting.transcript &&
    meeting.transcript.length > 0 &&
    !meeting.speakers_mapped &&
    meeting.attendees &&
    meeting.attendees.length > 0;

  async function handleRetryProcessing() {
    if (!meeting.workspace_id || !meeting.audio_url) {
      throw new Error("Meeting is missing audio or workspace info");
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const res = await fetch(`${apiUrl}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_id: meeting.id,
        workspace_id: meeting.workspace_id,
        audio_url: meeting.audio_url,
        attendees: meeting.attendees ?? [],
        language: "en",
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to restart processing");
    }

    // Flip back to queued locally — this also re-arms the realtime
    // subscription (the effect above skips failed/completed meetings).
    setMeeting((prev) => ({ ...prev, status: "queued" }));
  }

  function handleSpeakersMapped(
    updated: TranscriptSegment[],
    speakerMap?: Record<string, string>
  ) {
    setMeeting((prev) => {
      const replaceNames = (text: string) => {
        if (!speakerMap) return text;
        let result = text;
        for (const [old, name] of Object.entries(speakerMap)) {
          result = result.split(old).join(name);
        }
        return result;
      };

      return {
        ...prev,
        transcript: updated,
        speakers_mapped: true,
        summary: prev.summary ? replaceNames(prev.summary) : prev.summary,
        follow_up_email: prev.follow_up_email
          ? replaceNames(prev.follow_up_email)
          : prev.follow_up_email,
        action_items: prev.action_items
          ? prev.action_items.map((item) => ({
              ...item,
              owner: speakerMap?.[item.owner] ?? item.owner,
              task: replaceNames(item.task),
            }))
          : null,
        decisions: prev.decisions
          ? prev.decisions.map((d) => ({
              ...d,
              text: replaceNames(d.text),
              context: d.context ? replaceNames(d.context) : d.context,
            }))
          : null,
        open_questions: prev.open_questions
          ? prev.open_questions.map((q) => replaceNames(q))
          : null,
      };
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to meetings
      </Link>

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
        <StatusBadge status={meeting.status} />
      </div>

      {meeting.status === "queued" ||
      (meeting.status === "processing" && !hasTranscript) ? (
        <ProcessingState
          status={meeting.status}
          stage={meeting.processing_stage}
        />
      ) : meeting.status === "failed" ? (
        <FailedState
          onRetry={handleRetryProcessing}
          errorDetail={meeting.error_detail}
          hasTranscript={hasTranscript}
        />
      ) : (
        <>
          {isAnalyzing && (
            <div
              className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-muted-foreground"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>
                {meeting.processing_stage ?? "Analyzing meeting"} — the
                transcript is ready below; summary and action items will
                appear automatically.
              </span>
            </div>
          )}

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
                { value: "email", label: "Follow-up Email", icon: Mail },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#e4e4e7] data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-[13px]"
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
              {isAnalyzing && !meeting.summary ? (
                <GeneratingPlaceholder label="summary" />
              ) : (
                <SummaryTab meeting={meeting} />
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-5">
              {isAnalyzing && !meeting.action_items ? (
                <GeneratingPlaceholder label="action items" />
              ) : (
                <ActionItemsTab meeting={meeting} />
              )}
            </TabsContent>

            <TabsContent value="questions" className="mt-5">
              {isAnalyzing && !meeting.open_questions ? (
                <GeneratingPlaceholder label="open questions" />
              ) : (
                <QuestionsTab meeting={meeting} />
              )}
            </TabsContent>

            <TabsContent value="email" className="mt-5">
              {isAnalyzing && !meeting.follow_up_email ? (
                <GeneratingPlaceholder label="follow-up email" />
              ) : meeting.follow_up_email ? (
                <FollowUpEmailPanel
                  meeting={meeting}
                  onUpdate={(patch) =>
                    setMeeting((prev) => ({ ...prev, ...patch }))
                  }
                />
              ) : (
                <div
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No follow-up email generated yet.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
