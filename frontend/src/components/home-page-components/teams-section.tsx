import Link from "next/link";
import { Lock, Mail, Shield } from "lucide-react";
import { BG, MONO } from "./constants";

export function TeamsSection() {
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
