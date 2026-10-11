"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth, roleAllows } from "@/features/auth/AuthContext";
import { SkeletonList } from "@/components/ui/States";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "ড্যাশবোর্ড" },
  { href: "/admin/books", label: "বই" },
  { href: "/admin/ingestion-jobs", label: "প্রসেসিং কাজ" },
  { href: "/admin/ai-settings", label: "AI সেটিংস" },
  { href: "/admin/usage", label: "ব্যবহার" },
  { href: "/admin/feedback", label: "ফিডব্যাক" },
  { href: "/admin/audit-logs", label: "অডিট লগ" },
];

/** Admin shell: backend-driven permission gate (UI only; server enforces). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { me, loading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/welcome");
  }, [loading, user, router]);

  if (loading) return <SkeletonList rows={3} />;
  if (!user) return null;

  const allowed = roleAllows(me?.role, "admin") || roleAllows(me?.role, "books-manage");
  if (me && !allowed) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav aria-label="অ্যাডমিন" className="flex gap-2 overflow-x-auto rounded-lg border-2 border-ink bg-card p-2 shadow-pop lg:flex-col">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 font-bold hover:bg-muted",
                (pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href))) && "bg-ink text-background"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <p className="mt-2 text-xs text-mutedfg">ভূমিকা: {me?.role ?? "…"} · অনুমতি সার্ভার যাচাই করে।</p>
      </aside>
      <div>{children}</div>
    </div>
  );
}
