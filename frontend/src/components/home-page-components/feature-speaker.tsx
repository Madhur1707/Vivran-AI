import { CheckCircle } from "lucide-react";
import { AVATAR_COLORS, BG, INITIALS, MONO } from "./constants";

export function FeatureSpeaker() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            Attendee Intelligence
          </p>
          <h2
            className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-tight mb-5 leading-[1.1]"
            style={BG}
          >
            Finally know who said what.
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Indian accent optimised",
                sub: "Trained on Indian English across 12 regional dialects.",
              },
              {
                label: "Up to 20 attendees",
                sub: "Handles large all-hands and cross-team syncs effortlessly.",
              },
              {
                label: "Timestamped",
                sub: "Jump to any moment. Every word is seekable.",
              },
            ].map((pt) => (
              <div key={pt.label} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <CheckCircle size={11} style={{ color: "#d4d4d8" }} />
                </div>
                <div>
                  <span className="text-[14px] font-semibold text-foreground">
                    {pt.label}
                  </span>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                    {pt.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-8 rounded-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 60% 50%, rgba(255,255,255,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="relative rounded-2xl border overflow-hidden"
            style={{
              background: "#0a0a0c",
              borderColor: "rgba(255,255,255,0.09)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
                background: "#08080a",
              }}
            >
              <span
                className="text-[12px] font-semibold text-[#ffffff]"
                style={BG}
              >
                Transcript · Q3 Strategy Call
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                <span
                  className="text-[10px]"
                  style={{ color: "#34d399", ...MONO }}
                >
                  3 attendees identified
                </span>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {[
                {
                  speaker: "Rahul",
                  ts: "00:02:14",
                  text: "Q3 numbers are strong. I think we push the launch to October.",
                },
                {
                  speaker: "Priya",
                  ts: "00:02:31",
                  text: "Agreed. Rahul, can you send the updated deck to the board?",
                },
                {
                  speaker: "Rahul",
                  ts: "00:02:38",
                  text: "Done by end of day. Will loop in Neha on the financials.",
                },
                {
                  speaker: "Amit",
                  ts: "00:03:01",
                  text: "Should we delay the vendor announcement until October too?",
                },
                {
                  speaker: "Priya",
                  ts: "00:03:12",
                  text: "Yes. Let's align messaging. Amit, own that doc by Thursday.",
                },
              ].map((line, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: `${AVATAR_COLORS[line.speaker]}20`,
                        color: AVATAR_COLORS[line.speaker],
                        border: `1px solid ${AVATAR_COLORS[line.speaker]}30`,
                      }}
                    >
                      {INITIALS[line.speaker]}
                    </div>
                    {i < 4 && (
                      <div
                        className="w-px flex-1 min-h-3"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    )}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: AVATAR_COLORS[line.speaker] }}
                      >
                        {line.speaker}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ ...MONO, color: "rgba(161,161,170,0.4)" }}
                      >
                        {line.ts}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                      {line.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
