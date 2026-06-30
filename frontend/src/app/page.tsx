import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingNavbar } from "@/components/landing-navbar";
import {
  Zap,
  Play,
  CheckCircle,
  FileText,
  Bell,
  Search,
  ChevronRight,
  Upload,
  Users,
  Cpu,
  LayoutDashboard,
  ArrowRight,
  Link2Off,
  MailX,
  HelpCircle,
  Check,
  X,
  Shield,
  Mail,
  Lock,
} from "lucide-react";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

const AVATAR_COLORS: Record<string, string> = {
  Rahul: "#e4e4e7",
  Priya: "#a1a1aa",
  Amit: "#f472b6",
  Neha: "#34d399",
  Vikram: "#d4d4d8",
};
const INITIALS: Record<string, string> = {
  Rahul: "RA",
  Priya: "PR",
  Amit: "AM",
  Neha: "NE",
  Vikram: "VI",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <LandingNavbar />
      <HeroSection />
      <FeaturesGrid />
      <FeatureSpeaker />
      <FeatureActions />
      <FeatureSearch />
      <ProblemSection />
      <HowItWorks />
      <TestimonialsSection />
      <TeamsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ═══ HERO — Split Layout ═══ */
function HeroSection() {
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
              Validated by Razorpay · Itch Score 64
            </div>

            <h1
              className="text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.07] tracking-tight mb-6"
              style={BG}
            >
              <span className="text-foreground">Your meetings end.</span>
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #d4d4d8 0%, #e4e4e7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                The work shouldn&apos;t.
              </span>
            </h1>

            <p className="text-[clamp(15px,1.8vw,18px)] text-muted-foreground max-w-lg leading-relaxed mb-8">
              AI extracts action items, decisions and follow-ups from every
              meeting. Named by speaker. Sent to your team. Searchable forever.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-black transition-all duration-150 hover:opacity-90 hover:scale-[1.02] shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                  boxShadow: "0 0 24px rgba(255,255,255,0.35)",
                }}
              >
                Upload your first meeting
                <ChevronRight size={15} />
              </Link>
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-foreground border border-border hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-150">
                <Play
                  size={13}
                  className="fill-current text-muted-foreground"
                />
                Watch 60s demo
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {[
                "No credit card",
                "5 free meetings",
                "Works with Zoom, Meet, Teams",
              ].map((t, i) => (
                <span key={t} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="w-1 h-1 rounded-full bg-border inline-block" />
                  )}
                  <CheckCircle size={11} className="text-[#e4e4e7]" />
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
                    app.recaply.ai/meetings/sync-q2
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
                      Today · 38 min · 5 speakers
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

        {/* Trust logos */}
        <div className="mt-20 text-center">
          <p
            className="text-xs text-muted-foreground mb-5 uppercase tracking-widest"
            style={MONO}
          >
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["Zepto", "CRED", "Groww", "Razorpay", "Meesho", "PhonePe"].map(
              (c) => (
                <span
                  key={c}
                  className="text-[15px] font-semibold transition-colors duration-200 cursor-default hover:text-muted-foreground"
                  style={{
                    ...BG,
                    color: "rgba(161,161,170,0.35)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {c}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ FEATURES GRID ═══ */
function FeaturesGrid() {
  const features = [
    {
      icon: FileText,
      title: "Named transcripts",
      desc: "Every word attributed to the right speaker. Works across accents and crosstalk.",
    },
    {
      icon: CheckCircle,
      title: "Action item extraction",
      desc: "AI identifies what was promised, by whom, and when — without you lifting a finger.",
    },
    {
      icon: Bell,
      title: "Smart follow-ups",
      desc: "Auto-drafted emails and Slack messages sent to owners the moment the call ends.",
    },
    {
      icon: Search,
      title: "Forever searchable",
      desc: "Full-text search across every meeting, decision, and commitment your team has ever made.",
    },
  ];
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-xs text-muted-foreground uppercase tracking-widest mb-3"
            style={MONO}
          >
            What Vivran.ai does
          </p>
          <h2
            className="text-[clamp(28px,4vw,42px)] font-bold tracking-tight"
            style={BG}
          >
            Built for the speed of Indian ops
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border border-border bg-card transition-all duration-200 hover:border-[rgba(255,255,255,0.3)] group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-[rgba(255,255,255,0.15)]"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <f.icon size={17} className="text-[#d4d4d8]" />
              </div>
              <h3
                className="text-[15px] font-semibold text-foreground mb-2"
                style={BG}
              >
                {f.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ FEATURE — Speaker Intelligence ═══ */
function FeatureSpeaker() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            Speaker Intelligence
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
                label: "Up to 20 speakers",
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
                  3 speakers identified
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

/* ═══ FEATURE — Action Items ═══ */
function FeatureActions() {
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

/* ═══ FEATURE — Search ═══ */
function FeatureSearch() {
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
                sub: "Every answer links back to the exact meeting, speaker, and timestamp.",
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

/* ═══ PROBLEM ═══ */
function ProblemSection() {
  const problems = [
    {
      icon: Link2Off,
      title: "Action items vanish",
      body: "Someone says Rahul will send the deck. Nobody writes it down. Friday comes. No deck.",
    },
    {
      icon: MailX,
      title: "Follow-ups never happen",
      body: "Meeting ends. Client never gets a summary. Team forgets what was decided.",
    },
    {
      icon: HelpCircle,
      title: "Meeting amnesia",
      body: "What did we decide in April? Someone spends 20 minutes digging through WhatsApp.",
    },
  ];
  return (
    <section className="py-24 px-6 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            The Problem
          </p>
          <h2
            className="text-[clamp(26px,4vw,42px)] font-bold tracking-tight"
            style={BG}
          >
            Every meeting has the same ending.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {problems.map((p) => (
            <div
              key={p.title}
              className="p-7 rounded-xl border border-border bg-card flex flex-col gap-4"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <p.icon size={18} style={{ color: "#f87171" }} />
              </div>
              <div>
                <h3
                  className="text-[16px] font-semibold text-foreground mb-2"
                  style={BG}
                >
                  {p.title}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <div
            className="inline-flex items-start gap-4 px-8 py-6 rounded-xl border max-w-2xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            <span
              className="text-3xl leading-none mt-0.5"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              &ldquo;
            </span>
            <p
              className="text-[15px] font-semibold leading-relaxed"
              style={{ color: "#c7d2fe" }}
            >
              Indian employees lose{" "}
              <span style={{ color: "#d4d4d8" }}>4.5 hours weekly</span> to
              meetings with no documented outcomes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ HOW IT WORKS ═══ */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: Upload,
      title: "Upload",
      body: "Upload any recording — MP3, MP4, WAV. Up to 3 hours.",
    },
    {
      num: "02",
      icon: Users,
      title: "Add names",
      body: "Type who was in the meeting. We match voices to people.",
    },
    {
      num: "03",
      icon: Cpu,
      title: "AI processes",
      body: "Whisper transcribes. AI extracts everything.",
    },
    {
      num: "04",
      icon: LayoutDashboard,
      title: "Ready",
      body: "Summary on dashboard. Email auto-sent to every owner.",
    },
  ];
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            How it works
          </p>
          <h2
            className="text-[clamp(26px,4vw,42px)] font-bold tracking-tight"
            style={BG}
          >
            Upload. Wait 3 minutes. Done.
          </h2>
        </div>
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.num} className="relative flex flex-col">
              <div
                className="absolute -top-2 right-3 text-[72px] font-black leading-none select-none pointer-events-none"
                style={{ ...BG, color: "rgba(255,255,255,0.07)" }}
              >
                {step.num}
              </div>
              <div className="relative p-6 rounded-xl border border-border bg-card flex-1 shadow-sm">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <step.icon size={17} style={{ color: "#e4e4e7" }} />
                </div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1 text-[#e4e4e7]"
                  style={MONO}
                >
                  Step {step.num}
                </p>
                <h3
                  className="text-[16px] font-bold text-foreground mb-2"
                  style={BG}
                >
                  {step.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-7 h-7 rounded-full border border-border bg-background shadow-sm">
                  <ArrowRight size={13} style={{ color: "#e4e4e7" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ TESTIMONIALS ═══ */
function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "We used to spend 30 mins after every client call writing notes. Now zero. The AI does it better than we did.",
      name: "Ananya Sharma",
      title: "VP Product, B2B SaaS startup",
    },
    {
      quote:
        "Found a vendor decision from 6 months ago in 4 seconds. Used to take me 20 minutes digging through email.",
      name: "Karan Mehta",
      title: "Founder, D2C brand",
    },
    {
      quote:
        "Clients get professional follow-ups after every call automatically. Even catches the subtle commitments.",
      name: "Deepika Nair",
      title: "Account Manager, IT services",
    },
  ];
  return (
    <section className="py-24 px-6 border-t border-border bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-center text-[clamp(26px,4vw,42px)] font-bold tracking-tight mb-14"
          style={BG}
        >
          Teams that never miss a follow-up
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <span
                className="text-4xl font-bold leading-none"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                &ldquo;
              </span>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 -mt-3">
                {t.quote}
              </p>
              <div className="border-t border-border pt-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#d4d4d8",
                  }}
                >
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-10 text-center">
          {[
            { num: "4.5 hrs", label: "saved per week" },
            { num: "94%", label: "action item accuracy" },
            { num: "10,000+", label: "meetings processed" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-[#e4e4e7]">{s.num}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ PRICING ═══ */
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "₹0",
      sub: "For individuals trying it out",
      cta: "Start free",
      hl: false,
      features: [
        "5 meetings per month",
        "Action items extraction",
        "Basic transcript",
        "Email follow-up",
      ],
      missing: ["RAG search", "WhatsApp delivery", "Team sharing"],
    },
    {
      name: "Pro",
      price: "₹299",
      sub: "For professionals who run on meetings",
      cta: "Start Pro free for 7 days",
      hl: true,
      features: [
        "Unlimited meetings",
        "Action items + decisions + questions",
        "Named transcripts (10 speakers)",
        "Auto email follow-up",
        "RAG search — all meetings",
        "WhatsApp summary delivery",
        "Priority processing",
      ],
      missing: [],
    },
    {
      name: "Team",
      price: "₹999",
      sub: "For teams of up to 5 people",
      cta: "Start Team trial",
      hl: false,
      features: [
        "Everything in Pro",
        "5 team members",
        "Shared meeting workspace",
        "Team action item tracking",
        "Analytics dashboard",
        "Slack integration",
        "Dedicated support",
      ],
      missing: [],
    },
  ];
  return (
    <section id="pricing" className="py-24 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2
            className="text-[clamp(26px,4vw,42px)] font-bold tracking-tight mb-3"
            style={BG}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-xl border p-6 ${p.hl ? "border-[#e4e4e7] shadow-lg shadow-[rgba(255,255,255,0.15)]" : "border-border"} bg-card`}
            >
              {p.hl && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-black"
                  style={{
                    background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                  }}
                >
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold" style={BG}>
                {p.name}
              </h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.sub}</p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
                {p.missing.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground/40"
                  >
                    <X className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-6 block">
                <button
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${p.hl ? "text-black hover:opacity-90" : "text-foreground border border-border hover:border-[rgba(255,255,255,0.4)]"}`}
                  style={
                    p.hl
                      ? {
                        background:
                          "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                      }
                      : {}
                  }
                >
                  {p.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground/60">
          All plans: 256-bit encryption · Indian data residency · Cancel anytime
          · No lock-in
        </p>
      </div>
    </section>
  );
}

/* ═══ TEAMS ═══ */
function TeamsSection() {
  const teamFeatures = [
    {
      icon: Shield,
      title: "Role-based access",
      desc: "Admins see every meeting across the company. Members only see meetings they uploaded or attended — enforced automatically, not just hidden in the UI.",
    },
    {
      icon: Mail,
      title: "Invite by email",
      desc: "Add teammates in seconds from your team dashboard. They sign up and land straight inside your company workspace.",
    },
    {
      icon: Lock,
      title: "Private by default",
      desc: "Meeting visibility is enforced at the database level. No accidental leaks between team members or departments.",
    },
  ];
  return (
    <section id="teams" className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#e4e4e7]"
            style={MONO}
          >
            Teams
          </p>
          <h2
            className="text-[clamp(26px,4vw,42px)] font-bold tracking-tight mb-3"
            style={BG}
          >
            Built for companies, not just individuals
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Invite your whole team. Everyone sees exactly what they should —
            nothing more.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {teamFeatures.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border border-border bg-card transition-all duration-200 hover:border-[rgba(255,255,255,0.3)] group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-[rgba(255,255,255,0.15)]"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <f.icon size={17} className="text-[#d4d4d8]" />
              </div>
              <h3
                className="text-[15px] font-semibold text-foreground mb-2"
                style={BG}
              >
                {f.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/login">
            <button
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-black transition-all duration-150 hover:opacity-90 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)" }}
            >
              Set up your team
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══ FAQ ═══ */
function FAQSection() {
  const faqs = [
    {
      q: "Does it work with Indian accents and Hinglish?",
      a: "Yes. We use Whisper large-v3, the most accurate transcription model for Indian accents. It handles Hinglish, regional accents, and mixed language meetings well.",
    },
    {
      q: "Where is my meeting data stored?",
      a: "All data is stored on Indian servers (Mumbai region). We never train our models on your meeting content.",
    },
    {
      q: "What meeting platforms does it support?",
      a: "Upload any recording from Zoom, Google Meet, Microsoft Teams, or any platform that exports MP3/MP4/WAV files.",
    },
    {
      q: "How does it know who is speaking?",
      a: "You enter the attendee names before processing. Our AI matches voices to names using voice patterns and conversation context.",
    },
    {
      q: "How accurate are the action items?",
      a: "In our testing, 94% of action items are correctly extracted. You can edit any item before sending the follow-up email.",
    },
    {
      q: "Can I use it for client meetings?",
      a: "Yes. Many users run it on client calls. The follow-up email can be sent directly to clients with one click.",
    },
  ];
  return (
    <section className="py-24 px-6 border-t border-border bg-muted/20">
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-center text-[clamp(26px,4vw,42px)] font-bold tracking-tight mb-14"
          style={BG}
        >
          Frequently asked questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="p-5 rounded-xl border border-border bg-card"
            >
              <h3 className="text-[14px] font-semibold mb-2" style={BG}>
                {f.q}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ FINAL CTA ═══ */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-card px-6 py-24 text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-2xl relative z-10">
        <h2
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={BG}
        >
          Your next meeting starts in 10 minutes.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Make it the last one where nothing gets documented.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold text-black transition-all duration-150 hover:opacity-90 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
              boxShadow: "0 0 24px rgba(255,255,255,0.35)",
            }}
          >
            Upload a recording free
            <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground/50">
          No credit card · 5 free meetings · Setup in 2 minutes
        </p>
      </div>
    </section>
  );
}

/* ═══ FOOTER ═══ */
function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-4">
        <div>
          <div className="mb-3">
            <img
              src="/Vivran.ai.jpg"
              alt="Vivran.ai"
              className="h-20 rounded"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            AI meeting intelligence for India
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="hover:text-foreground transition-colors"
              >
                How it works
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="hover:text-foreground transition-colors"
              >
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                About
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Blog
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Security
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-5xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Vivran.ai. Made in India. All meeting
        data stored in Mumbai.
      </div>
    </footer>
  );
}
