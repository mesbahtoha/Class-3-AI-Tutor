"use client";

import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { citationLabel } from "@/lib/utils";
import type { Source } from "@/lib/api/contracts";

/** Backend-only citations. Expandable, page-accurate, never fabricated. */
export function SourceCitation({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border-2 border-dashed border-line bg-background p-2 text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 font-bold"
      >
        <span className="grid size-6 place-items-center rounded-full bg-quaternary text-ink">
          <BookOpen size={14} strokeWidth={2.5} />
        </span>
        উৎস: {sources[0]?.bookTitle}
        {sources.length > 1 ? ` (+${sources.length - 1})` : ""}
        <ChevronDown size={16} strokeWidth={2.5} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 pl-8">
          {sources.map((s) => (
            <li key={s.chunkId}>📖 {citationLabel(s)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-1 p-1" aria-label="টিউটর লিখছে">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot size-2.5 rounded-full bg-accent" />
      ))}
    </div>
  );
}
