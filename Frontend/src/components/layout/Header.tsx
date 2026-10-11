"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Home, Menu, MessageCircle, Settings, ShieldCheck, Sparkles, User, X, BarChart3, LogOut } from "lucide-react";
import { useAuth, roleAllows } from "@/features/auth/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

const LEARNER_LINKS = [
  { href: "/", label: "হোম", icon: Home },
  { href: "/tutor", label: "টিউটর", icon: MessageCircle },
  { href: "/books", label: "বই", icon: BookOpen },
  { href: "/practice", label: "অনুশীলন", icon: Sparkles },
  { href: "/progress", label: "অগ্রগতি", icon: BarChart3 },
];

const ACCOUNT_LINKS = [
  { href: "/parent", label: "অভিভাবক", icon: User },
  { href: "/settings", label: "সেটিংস", icon: Settings },
];

function Mascot() {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="Class 3 AI Tutor হোম">
      <span className="wiggle grid size-10 place-items-center rounded-full border-2 border-ink bg-accent font-display text-xl font-extrabold text-white shadow-pop-sm">
        প
      </span>
      <span className="font-display text-lg font-extrabold">
        পড়ালেখা<span className="text-secondary">বন্ধু</span>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const { me, signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = roleAllows(me?.role, "admin") || roleAllows(me?.role, "books-manage");

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Mascot />
        <nav className="hidden items-center gap-1 md:flex" aria-label="প্রধান">
          {LEARNER_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-4 py-2 font-bold hover:bg-muted",
                pathname === l.href && "bg-tertiary text-ink border-2 border-ink"
              )}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "rounded-full px-4 py-2 font-bold hover:bg-muted",
                pathname.startsWith("/admin") && "bg-tertiary text-ink border-2 border-ink"
              )}
            >
              অ্যাডমিন
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <button
              onClick={signOut}
              aria-label="সাইন আউট"
              className="btn-pop grid size-12 place-items-center rounded-full border-2 border-ink bg-card shadow-pop hover:shadow-pop-lg"
            >
              <LogOut size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <Link
              href="/welcome"
              className="btn-pop hidden rounded-full border-2 border-ink bg-accent px-5 py-2 font-display font-bold text-white shadow-pop hover:shadow-pop-lg sm:block"
            >
              শুরু করো
            </Link>
          )}
          <button
            className="grid size-12 place-items-center rounded-full border-2 border-ink bg-card md:hidden"
            aria-label={open ? "মেনু বন্ধ করো" : "মেনু খোলো"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t-2 border-ink bg-background px-4 py-3 md:hidden" aria-label="মোবাইল">
          <div className="grid gap-1">
            {[...LEARNER_LINKS, ...ACCOUNT_LINKS].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 font-bold hover:bg-muted",
                  pathname === l.href && "bg-tertiary text-ink border-2 border-ink"
                )}
              >
                <l.icon size={20} strokeWidth={2.5} /> {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 font-bold hover:bg-muted"
              >
                <ShieldCheck size={20} strokeWidth={2.5} /> অ্যাডমিন
              </Link>
            )}
            {!user && (
              <Link
                href="/welcome"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-full border-2 border-ink bg-accent px-4 py-3 text-center font-display font-bold text-white"
              >
                শুরু করো
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
