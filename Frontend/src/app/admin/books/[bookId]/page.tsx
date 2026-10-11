"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface BookDetail {
  id: string;
  title: string;
  grade: string;
  curriculumName: string;
  subjectName: string;
  language: string;
  editionLabel?: string | null;
  processingStatus: string;
  publicationStatus: string;
  pageCount?: number | null;
  extractionNotes?: string | null;
  ingestionJobs?: Array<{ id: string; status: string; progress: number; errorCode?: string | null; errorDetail?: string | null }>;
}

export default function AdminBookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["admin", "book", bookId],
    queryFn: () => api.get<BookDetail>(`/admin/books/${bookId}`, { token }).then((r) => r.data),
    refetchInterval: (q) => {
      const s = q.state.data?.processingStatus;
      // Poll while work is in flight; stop on terminal states/unmount.
      return s === "PROCESSING" || s === "QUEUED" ? 4000 : false;
    },
  });

  const preview = useQuery({
    queryKey: ["admin", "book", bookId, "preview"],
    queryFn: () =>
      api.get<{ pages: Array<{ pageNumber: number; text: string; extractionQuality: string }> }>(
        `/admin/books/${bookId}/preview`,
        { token }
      ).then((r) => r.data),
  });

  useEffect(() => {
    if (detail.data?.processingStatus === "PUBLISHED") preview.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data?.processingStatus]);

  const act = useMutation({
    mutationFn: (action: string) => api.post(`/admin/books/${bookId}/${action}`, { token }),
    onSuccess: () => {
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "book", bookId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "books"] });
    },
  });

  const b = detail.data;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin/books" className="font-bold text-accent underline">← সব বই</Link>
      {detail.isLoading && <SkeletonList rows={3} />}
      {detail.isError && <EmptyState title="বই পাওয়া যায়নি" message="আবার চেষ্টা করো।" />}
      {b && (
        <>
          <Card featured>
            <CardBody>
              <h1 className="font-display text-2xl font-extrabold">{b.title}</h1>
              <p className="text-mutedfg">{b.subjectName} · {b.grade} · {b.curriculumName} · {b.language}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={statusTone(b.processingStatus)}>⚙️ {b.processingStatus}</Badge>
                <Badge tone={statusTone(b.publicationStatus)}>📢 {b.publicationStatus}</Badge>
                {b.pageCount ? <Badge tone="gray">📄 {b.pageCount} পাতা</Badge> : null}
              </div>
              {b.extractionNotes && (
                <p className="mt-2 rounded-md border-2 border-dashed border-line p-2 text-sm">⚠️ {b.extractionNotes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { a: "process", l: "প্রসেস" },
                  { a: "publish", l: "প্রকাশ ✅" },
                  { a: "unpublish", l: "অপ্রকাশ" },
                  { a: "reindex", l: "রি-ইনডেক্স" },
                  { a: "archive", l: "আর্কাইভ" },
                ].map((x) => (
                  <Button key={x.a} size="sm" variant="secondary" onClick={() => setConfirm(x.a)}>{x.l}</Button>
                ))}
              </div>
              {b.publicationStatus === "PUBLISHED" && (
                <p className="mt-2 text-xs text-mutedfg">প্রকাশিত — শিক্ষার্থীদের উত্তরে এই বই থেকে উদ্ধৃতি আসতে পারে। সংস্করণ বদলালে উদ্ধৃতি বদলাতে পারে।</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="font-display font-bold">সাম্প্রতিক প্রসেসিং কাজ</h2>
              {(b.ingestionJobs ?? []).length === 0 && <p className="text-sm text-mutedfg">কোনো কাজ নেই।</p>}
              <ul className="mt-2 space-y-2">
                {(b.ingestionJobs ?? []).map((j) => (
                  <li key={j.id} className="rounded-md border-2 border-line p-2 text-sm">
                    <Badge tone={statusTone(j.status)}>{j.status}</Badge> {j.progress}%
                    {j.errorCode && <span className="ml-2 font-bold text-secondary">{j.errorCode}</span>}
                    {j.errorDetail && <p className="mt-1 text-mutedfg">{j.errorDetail.slice(0, 300)}</p>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="font-display font-bold">পাতার প্রিভিউ (প্রথম ১০)</h2>
              {preview.isLoading && <SkeletonList rows={2} />}
              {(preview.data?.pages ?? []).map((p) => (
                <details key={p.pageNumber} className="mt-2 rounded-md border-2 border-line p-2">
                  <summary className="cursor-pointer font-bold">
                    পাতা {p.pageNumber} {p.extractionQuality !== "ok" ? "⚠️" : ""}
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.text.slice(0, 1500)}</p>
                </details>
              ))}
            </CardBody>
          </Card>
        </>
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && act.mutate(confirm)}
        busy={act.isPending}
        title="নিশ্চিত?"
        message={confirm === "publish" ? "পর্যালোচনা শেষ? প্রকাশের পর শিক্ষার্থীরা এই বই থেকে উত্তর পাবে।" : "এই কাজটি বইয়ের অবস্থা বদলে দেবে।"}
        confirmLabel="হ্যাঁ"
      />
    </div>
  );
}
