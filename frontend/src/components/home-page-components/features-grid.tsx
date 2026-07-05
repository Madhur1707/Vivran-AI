import { Bell, CheckCircle, FileText, Search } from "lucide-react";
import { BG, MONO } from "./constants";

export function FeaturesGrid() {
  const features = [
    {
      icon: FileText,
      title: "Named transcripts",
      desc: "Every word attributed to the right attendee. Works across accents and crosstalk.",
    },
    {
      icon: CheckCircle,
      title: "Action item extraction",
      desc: "AI identifies what was promised, by whom, and when — without you lifting a finger.",
    },
    {
      icon: Bell,
      title: "Smart follow-ups",
      desc: "Follow-up drafted the moment the call ends. Send it to owners by email or WhatsApp with one click.",
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
