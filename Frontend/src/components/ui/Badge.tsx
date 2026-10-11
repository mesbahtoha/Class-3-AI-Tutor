"use client";

import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  violet: "bg-accent text-white",
  pink: "bg-secondary text-white",
  amber: "bg-tertiary text-ink",
  green: "bg-quaternary text-ink",
  gray: "bg-muted text-mutedfg",
  ink: "bg-ink text-background",
};

/** Status badge: shape + text label, never color-alone. */
export function Badge({ tone = "gray", children, className }: { tone?: keyof typeof tones | string; children: React.ReactNode; className?: string }) {
  const t = tones[tone as string] ?? tones.gray;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border-2 border-ink px-3 py-0.5 text-xs font-bold", t, className)}>
      {children}
    </span>
  );
}

export function statusTone(status: string): string {
  const s = status.toUpperCase();
  if (["PUBLISHED", "SUCCEEDED", "READY", "ACTIVE", "ANSWERED", "OK"].includes(s)) return "green";
  if (["PROCESSING", "RUNNING", "QUEUED", "REVIEW_REQUIRED", "READY_TO_PUBLISH"].includes(s)) return "amber";
  if (["FAILED", "UNPUBLISHED", "ARCHIVED", "DELETED", "INSUFFICIENT_BOOK_CONTEXT"].includes(s)) return "pink";
  return "gray";
}
