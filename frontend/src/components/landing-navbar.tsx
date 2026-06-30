"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronRight } from "lucide-react";

const NAV_LINKS = ["Features", "How it works", "Pricing", "Teams"];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center flex-shrink-0 -ml-4">
          <img
            src="/Vivran.ai.jpg"
            alt="Vivran.ai"
            className="h-20 rounded"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/\s/g, "-")}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-sm font-medium text-black transition-all duration-150 hover:opacity-90 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)" }}
          >
            Start free
          </Link>
        </div>

        <button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`} className="text-sm text-muted-foreground hover:text-foreground">
              {l}
            </a>
          ))}
          <div className="flex gap-3 pt-2 border-t border-border">
            <Link href="/login" className="text-sm text-muted-foreground">Sign in</Link>
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-black"
              style={{ background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)" }}
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
