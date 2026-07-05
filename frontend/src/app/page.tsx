import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingNavbar } from "@/components/landing-navbar";
import { HeroSection } from "@/components/home-page-components/hero-section";
import { FeaturesGrid } from "@/components/home-page-components/features-grid";
import { FeatureSpeaker } from "@/components/home-page-components/feature-speaker";
import { FeatureActions } from "@/components/home-page-components/feature-actions";
import { FeatureSearch } from "@/components/home-page-components/feature-search";
import { ProblemSection } from "@/components/home-page-components/problem-section";
import { HowItWorks } from "@/components/home-page-components/how-it-works";
import { TestimonialsSection } from "@/components/home-page-components/testimonials-section";
import { TeamsSection } from "@/components/home-page-components/teams-section";
import { PricingSection } from "@/components/home-page-components/pricing-section";
import { FAQSection } from "@/components/home-page-components/faq-section";
import { FinalCTA } from "@/components/home-page-components/final-cta";
import { Footer } from "@/components/home-page-components/footer";

async function getMeetingsProcessed(): Promise<number | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/stats/public`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.meetings_processed === "number"
      ? data.meetings_processed
      : null;
  } catch {
    // Backend cold start or unreachable — don't block the landing page on it.
    return null;
  }
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const meetingsProcessed = await getMeetingsProcessed();

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
      <TestimonialsSection meetingsProcessed={meetingsProcessed} />
      <TeamsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
