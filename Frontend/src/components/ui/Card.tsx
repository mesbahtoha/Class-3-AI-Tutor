"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sticker card: white, ink border, hard offset shadow, wiggle on hover. */
export function Card({ className, children, featured }: { className?: string; children: ReactNode; featured?: boolean }) {
  return (
    <div
      className={cn(
        "card-wiggle rounded-lg border-2 border-ink bg-card",
        featured ? "shadow-sticker-pink" : "shadow-sticker",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
