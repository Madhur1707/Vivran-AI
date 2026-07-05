import { BG } from "./constants";

export function TestimonialsSection({
  meetingsProcessed,
}: {
  meetingsProcessed: number | null;
}) {
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
            ...(meetingsProcessed !== null
              ? [{ num: String(meetingsProcessed), label: "meetings processed" }]
              : []),
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
