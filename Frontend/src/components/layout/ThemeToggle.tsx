"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";

/** Dark/light toggle: sun/moon in a chunky pill, persisted + system-aware. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "লাইট মোড চালু করো" : "ডার্ক মোড চালু করো"}
      aria-pressed={dark}
      className="btn-pop grid size-12 place-items-center rounded-full border-2 border-ink bg-tertiary text-ink shadow-pop hover:shadow-pop-lg active:shadow-pop-sm"
    >
      {dark ? <Sun size={22} strokeWidth={2.5} /> : <Moon size={22} strokeWidth={2.5} />}
    </button>
  );
}
