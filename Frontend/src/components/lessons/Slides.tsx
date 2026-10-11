"use client";

import type { LessonSlide } from "@/lib/api/contracts";

/** Approved slide-type registry (spec §12). Unknown types → controlled fallback, never raw HTML. */
export function isSupportedSlide(type: string): boolean {
  return ["TITLE", "EXPLANATION", "IMAGE", "DIAGRAM", "EXAMPLE", "INTERACTIVE", "QUIZ", "SUMMARY"].includes(type);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function SlideView({ slide }: { slide: LessonSlide }) {
  const d = slide.data ?? {};
  switch (slide.type) {
    case "TITLE":
      return (
        <div className="text-center">
          <h3 className="font-display text-3xl font-extrabold">{str(d.heading, "পাঠ")}</h3>
          {str(d.subheading) && <p className="mt-1 text-mutedfg">{str(d.subheading)}</p>}
        </div>
      );
    case "EXPLANATION":
      return (
        <div>
          <p className="text-lg">{str(d.body)}</p>
          {list(d.points).length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-6">
              {list(d.points).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      );
    case "IMAGE":
      return (
        <figure className="text-center">
          <div className="dot-grid grid place-items-center rounded-md border-2 border-dashed border-line p-8 text-6xl" aria-hidden>
            🖼️
          </div>
          <figcaption className="mt-2 text-sm text-mutedfg">{str(d.caption, str(d.alt, "ছবি"))}</figcaption>
        </figure>
      );
    case "DIAGRAM":
      return (
        <div>
          <h4 className="font-display text-xl font-bold">{str(d.title)}</h4>
          <p className="mt-1">{str(d.description)}</p>
          {list(d.labels).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {list(d.labels).map((l, i) => (
                <span key={i} className="rounded-full border-2 border-ink bg-tertiary px-3 py-1 text-sm font-bold">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    case "EXAMPLE":
      return (
        <div>
          <h4 className="font-display text-xl font-bold">📌 {str(d.title, "উদাহরণ")}</h4>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            {list(d.steps).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      );
    case "INTERACTIVE":
      return (
        <div className="rounded-md border-2 border-dashed border-accent bg-accent/5 p-4">
          <p className="font-bold">🙋 {str(d.prompt)}</p>
          {str(d.hint) && <p className="mt-1 text-sm text-mutedfg">ইঙ্গিত: {str(d.hint)}</p>}
        </div>
      );
    case "QUIZ": {
      const options = list(d.options);
      return (
        <div>
          <p className="font-bold">❓ {str(d.question)}</p>
          {options.length > 0 && (
            <div className="mt-2 grid gap-2">
              {options.map((o, i) => (
                <div key={i} className="rounded-md border-2 border-line bg-background px-3 py-2">{o}</div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "SUMMARY":
      return (
        <div>
          <h4 className="font-display text-xl font-bold">🌟 মনে রাখো</h4>
          <ul className="mt-2 space-y-1">
            {list(d.points).map((p, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden>✅</span>{p}</li>
            ))}
          </ul>
        </div>
      );
    default:
      return (
        <p className="rounded-md border-2 border-dashed border-line p-3 text-sm text-mutedfg">
          এই স্লাইডটা এখন দেখানো যাচ্ছে না। (ধরন: {String(slide.type)})
        </p>
      );
  }
}
