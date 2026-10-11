"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, RotateCw } from "lucide-react";
import { SlideView } from "@/components/lessons/Slides";
import { Button } from "@/components/ui/Button";
import type { LessonPlan } from "@/lib/api/contracts";

/** Lesson player: one slide at a time, progress, prev/next, reduced-motion safe. */
export function LessonPlayer({ lesson, onExit }: { lesson: LessonPlan; onExit?: () => void }) {
  const [index, setIndex] = useState(0);
  const total = lesson.slides.length;
  const slide = lesson.slides[index];

  if (total === 0) return <p>এই পাঠে কোনো স্লাইড নেই।</p>;

  return (
    <div className="rounded-lg border-2 border-ink bg-card shadow-sticker">
      <div className="flex items-center justify-between border-b-2 border-ink p-3">
        <p className="font-display font-bold" aria-live="polite">
          স্লাইড {index + 1} / {total}
        </p>
        <div className="flex gap-1" role="group" aria-label="স্লাইড নির্দেশক">
          {lesson.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`স্লাইড ${i + 1}`}
              aria-current={i === index}
              className={`size-3.5 rounded-full border-2 border-ink ${i === index ? "bg-accent" : "bg-muted"}`}
            />
          ))}
        </div>
        {onExit && (
          <button onClick={onExit} aria-label="পাঠ বন্ধ করো" className="rounded-full border-2 border-ink p-1 hover:bg-muted">
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div key={index} className="animate-pop-in min-h-[220px] p-5 sm:p-8">
        {slide && <SlideView slide={slide} />}
      </div>
      <div className="flex items-center justify-between border-t-2 border-ink p-3">
        <Button size="sm" variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} icon={<ChevronLeft size={16} strokeWidth={2.5} />}>
          আগে
        </Button>
        <button
          onClick={() => setIndex(index)}
          aria-label="অ্যানিমেশন আবার দেখো"
          title="আবার দেখো"
          className="grid size-10 place-items-center rounded-full border-2 border-ink hover:bg-muted"
        >
          <RotateCw size={18} strokeWidth={2.5} />
        </button>
        <Button
          size="sm"
          disabled={index >= total - 1}
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          icon={<ChevronRight size={16} strokeWidth={2.5} />}
        >
          পরে
        </Button>
      </div>
    </div>
  );
}
