import { CheckCircle, FileText, Search } from "lucide-react";
import { BG, MONO } from "./constants";

export function FeatureSearch() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            Meeting Memory
          </p>
          <h2
            className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-tight mb-5 leading-[1.1]"
            style={BG}
          >
            Search every meeting
            <br />
            you&apos;ve ever had.
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Plain English queries",
                sub: 'Ask anything. "What did we decide about pricing in March?" Just works.',
              },
              {
                label: "Answer with source citation",
                sub: "Every answer links back to the exact meeting, attendee, and timestamp.",
              },
              {
                label: "Instant results",
                sub: "Across 2 meetings or 2,000 — results in under a second.",
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
          <div className="relative space-y-3">
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "#0a0a0c",
                borderColor: "rgba(255,255,255,0.3)",
                boxShadow:
                  "0 0 0 3px rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <Search size={16} style={{ color: "#e4e4e7", flexShrink: 0 }} />
                <span className="text-[14px] text-[#ffffff] flex-1">
                  What did we decide about the Bangalore office?
                </span>
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    color: "#d4d4d8",
                    ...MONO,
                  }}
                >
                  ↵ Enter
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "#0a0a0c",
                borderColor: "rgba(255,255,255,0.09)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="px-5 py-3.5 border-b flex items-center gap-2"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "#08080a",
                }}
              >
                <Search size={12} style={{ color: "rgba(161,161,170,0.5)" }} />
                <span className="text-[11px] text-[#a1a1aa]" style={MONO}>
                  1 result · searched 47 meetings
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div
                  className="p-4 rounded-xl border-l-2"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    borderColor: "#e4e4e7",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "#d4d4d8", ...MONO }}
                  >
                    AI Answer
                  </p>
                  <p className="text-[13px] text-[#ffffff] leading-relaxed">
                    The team decided to{" "}
                    <span
                      className="font-semibold"
                      style={{ color: "#c7d2fe" }}
                    >
                      delay the Bangalore office opening to Q1 2025
                    </span>{" "}
                    due to vendor contract issues. Neha was assigned to
                    renegotiate the lease terms before November.
                  </p>
                </div>
                <div
                  className="p-4 rounded-xl border"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "rgba(161,161,170,0.5)", ...MONO }}
                  >
                    Source
                  </p>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    >
                      <FileText size={14} style={{ color: "#d4d4d8" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#ffffff] truncate">
                        Leadership Sync · September 2024
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                            style={{
                              background: "rgba(52,211,153,0.2)",
                              color: "#34d399",
                            }}
                          >
                            NE
                          </div>
                          <span className="text-[11px] text-[#a1a1aa]">
                            Neha
                          </span>
                        </div>
                        <span
                          className="text-[11px]"
                          style={{ color: "rgba(161,161,170,0.4)" }}
                        >
                          ·
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "#d4d4d8", ...MONO }}
                        >
                          00:14:22
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "rgba(161,161,170,0.4)" }}
                        >
                          ·
                        </span>
                        <span className="text-[11px] text-[#a1a1aa]">
                          Sep 18, 2024
                        </span>
                      </div>
                      <p
                        className="text-[12px] mt-2 leading-snug"
                        style={{ color: "rgba(161,161,170,0.7)" }}
                      >
                        &ldquo;Let&apos;s push Bangalore to Q1. I&apos;ll
                        renegotiate the lease before November end.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
