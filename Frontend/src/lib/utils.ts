export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** "Class 3 Mathematics — Chapter 3 — Page 28" style citation label. */
export function citationLabel(s: {
  bookTitle: string;
  chapterTitle?: string;
  pageStart: number;
  pageEnd?: number;
}): string {
  const pages =
    s.pageEnd && s.pageEnd !== s.pageStart ? `পৃষ্ঠা ${s.pageStart}–${s.pageEnd}` : `পৃষ্ঠা ${s.pageStart}`;
  return `${s.bookTitle}${s.chapterTitle ? ` · ${s.chapterTitle}` : ""} · ${pages}`;
}

export function shortId(id: string, len = 8): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}
