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
