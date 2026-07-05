import { Bell, CheckCircle } from "lucide-react";
import { AVATAR_COLORS, BG, INITIALS, MONO } from "./constants";

export function FeatureActions() {
  return (
    <section className="py-24 px-6 border-t border-border bg-muted/20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="relative order-2 lg:order-1">
          <div
            className="absolute -inset-8 rounded-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 40% 50%, rgba(255,255,255,0.10) 0%, transparent 70%)",
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
                Action Items · Q3 Strategy
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#d4d4d8",
                  ...MONO,
                }}
              >
                4 open
              </span>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                {
                  who: "Rahul",
                  task: "Send updated board deck with Q3 financials",
                  due: "Today",
                  status: "overdue" as const,
                },
                {
                  who: "Amit",
                  task: "Own vendor announcement doc",
                  due: "Thu",
                  status: "at-risk" as const,
                },
                {
                  who: "Neha",
                  task: "Review financial projections section",
                  due: "Fri",
                  status: "on-track" as const,
                },
                {
                  who: "Priya",
                  task: "Align messaging across all October comms",
                  due: "Mon",
                  status: "on-track" as const,
                },
              ].map((item) => {
                const sm: Record<
                  string,
                  { label: string; bg: string; color: string; dot: string }
                > = {
                  overdue: {
                    label: "Overdue",
                    bg: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    dot: "#ef4444",
                  },
                  "at-risk": {
                    label: "At risk",
                    bg: "rgba(251,191,36,0.1)",
                    color: "#fbbf24",
                    dot: "#fbbf24",
                  },
                  "on-track": {
                    label: "On track",
                    bg: "rgba(52,211,153,0.1)",
                    color: "#34d399",
                    dot: "#34d399",
                  },
                };
                const s = sm[item.status];
                return (
                  <div
                    key={item.who + item.task}
                    className="group flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 hover:border-[rgba(255,255,255,0.25)]"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{
                        background: `${AVATAR_COLORS[item.who]}20`,
                        color: AVATAR_COLORS[item.who],
                        border: `1px solid ${AVATAR_COLORS[item.who]}25`,
                      }}
                    >
                      {INITIALS[item.who]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: AVATAR_COLORS[item.who] }}
                        >
                          {item.who}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-[10px]"
                            style={{ ...MONO, color: "rgba(161,161,170,0.5)" }}
                          >
                            {item.due}
                          </span>
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: s.bg }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: s.dot }}
                            />
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: s.color }}
                            >
                              {s.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#a1a1aa] leading-snug truncate">
                        {item.task}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="px-4 py-3 border-t flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <span className="text-[11px] text-[#a1a1aa]">
                Reminder emails sent automatically
              </span>
              <Bell size={12} style={{ color: "rgba(255,255,255,0.6)" }} />
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            Never Drop the Ball
          </p>
          <h2
            className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-tight mb-5 leading-[1.1]"
            style={BG}
          >
            Every commitment captured.
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Auto-assigned to person",
                sub: "Vivran.ai links the task to whoever made the commitment — no manual input.",
              },
              {
                label: "Deadline extracted",
                sub: '"By Friday" becomes a due date. "End of month" becomes a date on the calendar.',
              },
              {
                label: "Reminder sent",
                sub: "Owner gets an email 24 hours before. No follow-up meeting needed.",
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
      </div>
    </section>
  );
}
