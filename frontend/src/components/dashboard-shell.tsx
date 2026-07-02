"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CheckSquare,
  LayoutDashboard,
  Upload,
  Search,
  LogOut,
  Users,
  Loader2,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { User } from "@supabase/supabase-js";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };

const navItems = [
  { href: "/dashboard", label: "Meetings", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/actions", label: "Action Items", icon: CheckSquare },
  { href: "/dashboard/team", label: "Team", icon: Users },
];

export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = (user.email ?? "U")[0].toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(var(--background), 0.8)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center -ml-4">
            <img
              src="/Vivran.ai.jpg"
              alt="Vivran.ai"
              className="h-20 rounded"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                    color: isActive ? "#d4d4d8" : undefined,
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "#d4d4d8",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-64">
                <DropdownMenuItem
                  className="text-xs text-muted-foreground whitespace-normal break-all"
                  disabled
                >
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="cursor-pointer"
                >
                  {signingOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {signingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent cursor-pointer md:hidden">
                <Menu className="h-4.5 w-4.5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle style={BG}>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
                        style={{
                          background: isActive
                            ? "rgba(255,255,255,0.1)"
                            : "transparent",
                          color: isActive ? "#d4d4d8" : undefined,
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
        {children}
      </main>

      {signingOut && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "#d4d4d8" }}
            />
            <p className="text-[13px] text-muted-foreground" style={BG}>
              Signing out...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
