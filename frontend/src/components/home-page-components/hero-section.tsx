import Link from "next/link";
import { Zap, ChevronRight, Play, CheckCircle } from "lucide-react";
import { AVATAR_COLORS, BG, INITIALS, MONO } from "./constants";

export function HeroSection() {
  return (
    <section className="pt-28 pb-16 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="pt-8">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-6 border"
              style={{
                background: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,255,255,0.25)",
                color: "#a5b4fc",
              }}
            >
              <Zap size={11} className="fill-current" />
              Inspired by Razorpay · Itch Score 64
            </div>

            <h1
              className="text-[clamp(30px,4vw,46px)] font-bold leading-[1.15] tracking-tight mb-6"
              style={BG}
            >
              <span className="text-foreground">Meetings end.</span>{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #d4d4d8 0%, #e4e4e7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Momentum shouldn&apos;t.
              </span>
            </h1>

            <p className="text-[clamp(15px,1.8vw,18px)] text-muted-foreground max-w-lg leading-relaxed mb-8">
              AI turns every meeting into named action items, decisions, and
              follow-ups — sent straight to your team and searchable forever.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-5">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-black transition-all duration-150 hover:opacity-90 hover:scale-[1.02] shadow-lg w-full sm:w-auto"
                style={{
                  background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                  boxShadow: "0 0 24px rgba(255,255,255,0.35)",
                }}
              >
                Upload your first meeting
                <ChevronRight size={15} />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-foreground border border-border hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-150 w-full sm:w-auto">
                <Play
                  size={13}
                  className="fill-current text-muted-foreground"
                />
                Watch 60s demo
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
              {[
                "No credit card",
                "5 free meetings",
                "Auto-records Google Meet, or upload any file",
              ].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-border shrink-0" />
                  )}
                  <CheckCircle size={11} className="text-[#e4e4e7] shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Product Mockup */}
          <div className="relative">
            <div
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-40 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.22) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />

            <div
              className="relative rounded-xl border overflow-hidden shadow-2xl"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                background: "#0a0a0c",
                boxShadow:
                  "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 border-b"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "#08080a",
                }}
              >
                <div className="flex gap-1.5">
                  {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                    <div
                      key={c}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c, opacity: 0.8 }}
                    />
                  ))}
                </div>
                <div
                  className="flex-1 max-w-xs mx-auto h-5 rounded-md flex items-center px-2"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-[9px] text-muted-foreground truncate">
                    app.vivran.ai/meetings/sync-q2
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p
                      className="text-[12px] font-semibold text-[#ffffff]"
                      style={BG}
                    >
                      Q2 Sync — Product &amp; Sales
                    </p>
                    <p className="text-[10px] text-[#52525b] mt-0.5">
                      Today · 38 min · 4 attendees
                    </p>
                  </div>
                  <div
                    className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      color: "#d4d4d8",
                    }}
                  >
                    Done
                  </div>
                </div>

                {/* Transcript */}
                <div
                  className="mb-3 space-y-2.5 rounded-lg p-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    className="text-[9px] font-semibold uppercase tracking-wider text-[#52525b]"
                    style={MONO}
                  >
                    Transcript
                  </p>
                  {[
                    {
                      speaker: "Rahul",
                      time: "0:02",
                      text: "Let's align on pricing before the client call Friday.",
                    },
                    {
                      speaker: "Priya",
                      time: "1:14",
                      text: "I'll update the roadmap — Q3 milestones shifted.",
                    },
                    {
                      speaker: "Amit",
                      time: "2:38",
                      text: "I need to loop in the vendor today.",
                    },
                    {
                      speaker: "Neha",
                      time: "4:12",
                      text: "I'll review and send comments by EOD.",
                    },
                  ].map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <div
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold"
                        style={{
                          background: `${AVATAR_COLORS[line.speaker]}22`,
                          color: AVATAR_COLORS[line.speaker],
                        }}
                      >
                        {INITIALS[line.speaker]}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: AVATAR_COLORS[line.speaker] }}
                          >
                            {line.speaker}
                          </span>
                          <span
                            className="text-[9px]"
                            style={{ ...MONO, color: "rgba(161,161,170,0.4)" }}
                          >
                            {line.time}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#a1a1aa] leading-snug">
                          {line.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Items */}
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[9px] font-semibold uppercase tracking-wider text-[#52525b]"
                      style={MONO}
                    >
                      Action Items
                    </p>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        color: "#d4d4d8",
                      }}
                    >
                      4 open
                    </span>
                  </div>
                  {[
                    {
                      assignee: "Rahul",
                      task: "Send pricing deck to client",
                      due: "Fri",
                      color: "#d4d4d8",
                    },
                    {
                      assignee: "Priya",
                      task: "Update roadmap with Q3 changes",
                      due: "Mon",
                      color: "#a1a1aa",
                    },
                    {
                      assignee: "Amit",
                      task: "Schedule vendor call",
                      due: "Today",
                      urgent: true,
                      color: "#f472b6",
                    },
                    {
                      assignee: "Neha",
                      task: "Review contract clauses",
                      due: "Wed",
                      color: "#34d399",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1.5 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold"
                        style={{
                          background: `${item.color}20`,
                          color: item.color,
                        }}
                      >
                        {INITIALS[item.assignee]}
                      </div>
                      <span className="text-[10px] text-[#a1a1aa] flex-1 truncate">
                        {item.task}
                      </span>
                      <span
                        className="text-[9px] shrink-0"
                        style={{
                          color: item.urgent
                            ? "#f472b6"
                            : "rgba(161,161,170,0.5)",
                          ...MONO,
                        }}
                      >
                        {item.due}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Honest disclaimer — no real customer logos yet */}
        <div className="mt-20 text-center">
          <p
            className="text-xs text-muted-foreground mb-3 uppercase tracking-widest"
            style={MONO}
          >
            Right now
          </p>
          <p
            className="font-semibold whitespace-normal sm:whitespace-nowrap px-2"
            style={{
              ...BG,
              fontSize: "clamp(13px, 3.2vw, 15px)",
              color: "rgba(161,161,170,0.6)",
              letterSpacing: "-0.02em",
            }}
          >
            Built and shipped. Tested daily on real meetings. Trust logos come next.
          </p>
        </div>
      </div>
    </section>
  );
}
