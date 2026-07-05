import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BG } from "./constants";

export function FinalCTA() {
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
