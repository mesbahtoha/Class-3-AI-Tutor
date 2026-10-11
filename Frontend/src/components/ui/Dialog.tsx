"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Accessible dialog: focus management, Escape close, labelled. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  action,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className="animate-pop-in w-full max-w-md rounded-lg border-2 border-ink bg-card p-5 shadow-pop-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="বন্ধ করো" className="rounded-full border-2 border-ink p-1 hover:bg-muted">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div>{children}</div>
        {action && <div className="mt-4 flex justify-end gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** Destructive/state-changing confirmation. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "নিশ্চিত",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      action={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>বাতিল</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? "…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}
