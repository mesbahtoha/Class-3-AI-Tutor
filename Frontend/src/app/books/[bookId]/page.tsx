"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SkeletonList, EmptyState } from "@/components/ui/States";
import type { BookPublic } from "@/lib/api/contracts";

interface Chapter {
  id: string;
  title: string;
  number?: string | null;
  order: number;
  pageStart?: number | null;
  pageEnd?: number | null;
}

export default function BookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const book = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => api.get<BookPublic>(`/books/${bookId}`).then((r) => r.data),
  });
  const chapters = useQuery({
    queryKey: ["chapters", bookId],
    queryFn: () => api.get<Chapter[]>(`/books/${bookId}/chapters`).then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/books" className="font-bold text-accent underline">← সব বই</Link>
      {book.isLoading && <SkeletonList rows={2} />}
      {book.isError && <EmptyState title="বই পাওয়া যায়নি" message="বইটি হয়তো এখন আর প্রকাশিত নেই।" />}
      {book.data && (
        <Card featured>
          <CardBody>
            <h1 className="font-display text-2xl font-extrabold">{book.data.title}</h1>
            <p className="text-mutedfg">{book.data.subjectName} · {book.data.grade} · {book.data.curriculumName}</p>
            <p className="text-mutedfg">ভাষা: {book.data.language}{book.data.editionLabel ? ` · সংস্করণ: ${book.data.editionLabel}` : ""}</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/tutor?bookId=${book.data.id}`}><Button size="sm">এই বই থেকে জিজ্ঞেস করো 💬</Button></Link>
            </div>
          </CardBody>
        </Card>
      )}
      <h2 className="font-display text-xl font-extrabold">অধ্যায় 📑</h2>
      {chapters.isLoading && <SkeletonList rows={3} />}
      {chapters.data && chapters.data.length === 0 && <EmptyState title="অধ্যায় তালিকা নেই" message="পরে আবার দেখো।" />}
      <div className="space-y-2">
        {(chapters.data ?? []).map((c) => (
          <div key={c.id} className="rounded-md border-2 border-ink bg-card p-3 shadow-pop-sm">
            <p className="font-bold">{c.number ? `${c.number}. ` : ""}{c.title}</p>
            {(c.pageStart ?? null) !== null && <p className="text-sm text-mutedfg">পৃষ্ঠা {c.pageStart}{c.pageEnd ? `–${c.pageEnd}` : ""}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
