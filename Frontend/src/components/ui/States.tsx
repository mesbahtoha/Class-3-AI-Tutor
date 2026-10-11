"use client";

import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FriendlyError } from "@/lib/api/errors";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="লোড হচ্ছে">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="dot-grid grid place-items-center rounded-lg border-2 border-dashed border-line p-10 text-center">
      <div>
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border-2 border-ink bg-tertiary">
          <Inbox size={26} strokeWidth={2.5} className="text-ink" />
        </div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="text-mutedfg">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: FriendlyError; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border-2 border-ink bg-card p-5 shadow-pop">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-white">
          <AlertTriangle size={20} strokeWidth={2.5} />
        </span>
        <h3 className="font-display text-lg font-bold">{error.title}</h3>
      </div>
      <p className="mt-2">{error.message}</p>
      {error.requestId && <p className="mt-1 text-xs text-mutedfg">সাহায্যের জন্য ID: {error.requestId}</p>}
      {onRetry && error.retryable && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3" icon={<RotateCw size={16} strokeWidth={2.5} />}>
          আবার চেষ্টা করো
        </Button>
      )}
    </div>
  );
}
