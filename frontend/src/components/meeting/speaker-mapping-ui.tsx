"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Users } from "lucide-react";
import type { TranscriptSegment } from "@/lib/meeting-types";
import {
  BG,
  getAllSpeakerQuotes,
  getInitials,
  getSpeakerColor,
  getUniqueSpeakers,
} from "@/lib/meeting-utils";
import { remapSpeakers } from "@/services/meeting-service";

export function SpeakerMappingUI({
  transcript,
  attendees,
  meetingId,
  onMapped,
}: {
  transcript: TranscriptSegment[];
  attendees: string[];
  meetingId: string;
  onMapped: (
    updated: TranscriptSegment[],
    speakerMap: Record<string, string>
  ) => void;
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
      await remapSpeakers({ meetingId, speakerMap });

      const updated = transcript.map((seg) => ({
        ...seg,
        speaker: speakerMap[seg.speaker] || seg.speaker,
      }));
      onMapped(updated, speakerMap);
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
        borderColor: "rgba(255,255,255,0.25)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
      }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.15)" }}
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
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <Users className="h-3 w-3" style={{ color: "#d4d4d8" }} />
          <span
            className="text-[11px] font-medium"
            style={{ color: "#d4d4d8" }}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => shuffleQuote(speaker)}
                        className="h-auto shrink-0 gap-1 rounded-md px-2 py-1 text-[10px] font-medium hover:opacity-80"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          color: "#d4d4d8",
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
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-11">
                {attendees.map((attendee) => {
                  const isSelected = mapping[speaker] === attendee;
                  const isUsed = usedAttendees.has(attendee) && !isSelected;
                  return (
                    <Button
                      key={attendee}
                      variant="ghost"
                      size="xs"
                      disabled={isUsed}
                      className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium hover:bg-transparent disabled:opacity-30"
                      style={{
                        background: isSelected
                          ? `${color}20`
                          : "rgba(255,255,255,0.05)",
                        color: isSelected ? color : "rgba(161,161,170,0.7)",
                        border: `1px solid ${isSelected ? `${color}40` : "rgba(255,255,255,0.08)"}`,
                      }}
                      onClick={() => {
                        setMapping((prev) => ({
                          ...prev,
                          [speaker]: isSelected ? "" : attendee,
                        }));
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {attendee}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-5">
        <Button
          className="w-full rounded-xl text-black border-0 py-5"
          disabled={!allAssigned || saving}
          style={{
            background: allAssigned
              ? "linear-gradient(135deg, #e4e4e7, #a1a1aa)"
              : "rgba(255,255,255,0.2)",
            boxShadow: allAssigned
              ? "0 0 20px rgba(255,255,255,0.25)"
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
