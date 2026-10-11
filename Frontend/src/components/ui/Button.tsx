"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

/** Candy button: pill, chunky ink border, hard pop shadow, bounce physics. */
export function Button({ variant = "primary", size = "md", icon, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "btn-pop inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-ink font-display font-bold",
        size === "sm" && "min-h-[40px] px-4 text-sm",
        size === "md" && "px-6 text-base",
        size === "lg" && "px-8 py-3 text-lg",
        variant === "primary" && "bg-accent text-accentfg shadow-pop hover:shadow-pop-lg active:shadow-pop-sm",
        variant === "secondary" && "bg-transparent text-foreground shadow-none hover:bg-tertiary hover:text-ink",
        variant === "ghost" && "border-transparent shadow-none hover:bg-muted",
        variant === "danger" && "bg-secondary text-white shadow-pop hover:shadow-pop-lg active:shadow-pop-sm",
        rest.disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      {icon && <span className="grid size-7 place-items-center rounded-full bg-white/90 text-ink">{icon}</span>}
      {children}
    </button>
  );
}
