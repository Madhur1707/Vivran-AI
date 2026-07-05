import Link from "next/link";
import { Check, X } from "lucide-react";
import { BG } from "./constants";

function TestingPlanCard({ name }: { name: string }) {
  return (
    <div className="relative rounded-xl border border-border p-6 bg-card flex flex-col">
      <h3 className="text-lg font-semibold" style={BG}>
        {name}
      </h3>
      <span
        className="mt-2 inline-block w-fit text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}
      >
        Pricing in testing
      </span>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed flex-1">
        We&apos;re still testing usage and calculating fair pricing for this
        tier. In the meantime, sign up and try 5 meetings free on our Starter
        plan.
      </p>
      <Link href="/login" className="mt-6 block">
        <button className="w-full py-2.5 rounded-xl text-sm font-medium text-foreground border border-border hover:border-[rgba(255,255,255,0.4)] transition-all duration-150">
          Try the free tier
        </button>
      </Link>
    </div>
  );
}

export function PricingSection() {
  const starter = {
    name: "Starter",
    price: "₹0",
    sub: "For individuals trying it out",
    cta: "Start free",
    features: [
      "5 meetings per month",
      "Action items extraction",
      "Basic transcript",
      "Email follow-up",
    ],
    missing: ["RAG search", "WhatsApp delivery", "Team sharing"],
  };

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
            Start free today. Paid tiers are still being priced.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="relative rounded-xl border border-border p-6 bg-card">
            <h3 className="text-lg font-semibold" style={BG}>
              {starter.name}
            </h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">{starter.price}</span>
              <span className="text-sm text-muted-foreground"> / month</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{starter.sub}</p>
            <ul className="mt-6 space-y-2.5">
              {starter.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
              {starter.missing.map((f) => (
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
              <button className="w-full py-2.5 rounded-xl text-sm font-medium text-foreground border border-border hover:border-[rgba(255,255,255,0.4)] transition-all duration-150">
                {starter.cta}
              </button>
            </Link>
          </div>

          <TestingPlanCard name="Pro" />
          <TestingPlanCard name="Team" />
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground/60">
          256-bit encryption · Indian data residency · Cancel anytime
        </p>
      </div>
    </section>
  );
}
