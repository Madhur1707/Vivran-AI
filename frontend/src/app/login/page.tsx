"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, FileText, Search, Zap } from "lucide-react";
import { toast } from "sonner";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in successfully!");
    window.location.href = "/dashboard";
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: signupName,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Account created! Signing you in...");
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ background: "#000000" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)" }} />

        <div className="relative z-10">
          <Link href="/" className="mb-16 -ml-4">
            <img
              src="/Vivran.ai.jpg"
              alt="Vivran.ai"
              className="h-20 rounded"
            />
          </Link>

          <h2 className="text-[32px] font-bold text-white leading-[1.15] tracking-tight mb-4" style={BG}>
            Never lose a meeting
            <br />
            <span style={{ background: "linear-gradient(135deg, #d4d4d8, #e4e4e7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              decision again.
            </span>
          </h2>
          <p className="text-[15px] text-[#a1a1aa] leading-relaxed max-w-sm">
            AI-powered meeting intelligence that transcribes, extracts action items, and sends follow-ups automatically.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: FileText, text: "Speaker-labelled transcripts with timestamps" },
            { icon: CheckCircle, text: "Action items extracted with owner and deadline" },
            { icon: Search, text: "Search across all your past meetings instantly" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                <f.icon size={15} style={{ color: "#d4d4d8" }} />
              </div>
              <span className="text-[13px] text-[#a1a1aa]">{f.text}</span>
            </div>
          ))}

          <div className="mt-8 flex items-center gap-3 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex -space-x-2">
              {["RA", "PR", "AM"].map((init, i) => (
                <div key={init} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2" style={{ background: ["#52525b", "#3f3f46", "#71717a"][i], borderColor: "#000000", color: "white" }}>{init}</div>
              ))}
            </div>
            <div>
              <p className="text-[12px] text-white font-medium">10,000+ meetings processed</p>
              <p className="text-[11px] text-[#52525b]">Trusted by Indian teams</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <img
              src="/Vivran.ai.jpg"
              alt="Vivran.ai"
              className="h-20 rounded"
            />
            <p className="text-sm text-muted-foreground">AI meeting intelligence</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={BG}>Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account or create a new one</p>
          </div>

          <Card className="border-border">
            <Tabs defaultValue="login">
              <CardHeader>
                <TabsList className="w-full">
                  <TabsTrigger value="login" className="flex-1">Sign in</TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="login" className="mt-0">
                  <CardDescription className="mb-4">Enter your credentials to continue</CardDescription>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" type="password" placeholder="Your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <CardDescription className="mb-4">Create a new account to get started</CardDescription>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" type="text" placeholder="Your name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="you@company.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
