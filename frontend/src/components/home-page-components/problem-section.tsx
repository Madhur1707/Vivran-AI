import { HelpCircle, Link2Off, MailX } from "lucide-react";
import { BG, MONO } from "./constants";

export function ProblemSection() {
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
