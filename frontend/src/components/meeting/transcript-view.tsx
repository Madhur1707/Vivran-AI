"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TranscriptSegment } from "@/lib/meeting-types";
import {
  BG,
  MONO,
  formatTimestamp,
  getInitials,
  getSpeakerColor,
  getUniqueSpeakers,
} from "@/lib/meeting-utils";

export function TranscriptView({
  transcript,
}: {
  transcript: TranscriptSegment[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mySpeaker, setMySpeaker] = useState<string | null>(null);
  const allSpeakers = getUniqueSpeakers(transcript);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Let the page scroll when we're at the boundary in the scroll direction
      if (e.deltaY < 0 && atTop) return;
      if (e.deltaY > 0 && atBottom) return;

      // Otherwise consume the event inside the transcript box
      e.preventDefault();
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {/* Header */}
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

      {/* Speaker picker */}
      <div
        className="px-5 py-3 border-b flex items-center gap-3 flex-wrap"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.12em] shrink-0"
          style={{ color: "#71717a", ...MONO }}
        >
          {mySpeaker ? "Speaking as" : "Find yourself →"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {allSpeakers.map((speaker) => {
            const color = getSpeakerColor(speaker, allSpeakers);
            const isSelected = mySpeaker === speaker;
            return (
              <Button
                key={speaker}
                variant="ghost"
                size="xs"
                onClick={() => setMySpeaker(isSelected ? null : speaker)}
                className="h-auto cursor-pointer gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium hover:bg-transparent"
                style={{
                  background: isSelected ? `${color}25` : "rgba(255,255,255,0.05)",
                  color: isSelected ? color : "#9999a8",
                  border: `1px solid ${isSelected ? `${color}50` : "rgba(255,255,255,0.08)"}`,
                  boxShadow: isSelected ? `0 0 8px ${color}20` : "none",
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                  style={{
                    background: isSelected ? `${color}30` : "rgba(255,255,255,0.08)",
                    color: isSelected ? color : "#9999a8",
                  }}
                >
                  {getInitials(speaker)}
                </span>
                {speaker}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="px-5 py-4 space-y-3 max-h-145 overflow-y-auto [&::-webkit-scrollbar]:hidden scrollbar-none"
      >
        {transcript.map((seg, i) => {
          const isMe = mySpeaker !== null && seg.speaker === mySpeaker;
          const color = getSpeakerColor(seg.speaker, allSpeakers);

          if (isMe) {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[70%]">
                  <div className="flex items-baseline gap-1.5 justify-end mb-1">
                    <span
                      className="text-[10px]"
                      style={{ ...MONO, color: "rgba(161,161,170,0.35)" }}
                    >
                      {formatTimestamp(seg.start)}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color }}>
                      You
                    </span>
                  </div>
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-tr-sm"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}35`,
                    }}
                  >
                    <p className="text-[13px] leading-relaxed" style={{ color: "#e4e4e7" }}>
                      {seg.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="flex gap-2.5">
              <div className="shrink-0 mt-0.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: `${color}20`,
                    color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {getInitials(seg.speaker)}
                </div>
              </div>
              <div className="max-w-[70%]">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold" style={{ color }}>
                    {seg.speaker}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ ...MONO, color: "rgba(161,161,170,0.35)" }}
                  >
                    {formatTimestamp(seg.start)}
                  </span>
                </div>
                <div
                  className="px-4 py-2.5 rounded-2xl rounded-tl-sm"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {seg.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
