"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, statusTone } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface AdminBook {
  id: string;
  title: string;
  grade: string;
  curriculumName: string;
  subjectName: string;
  language: string;
  processingStatus: string;
  publicationStatus: string;
  pageCount?: number | null;
}

export default function AdminBooksPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; action: string; label: string } | null>(null);

  const list = useQuery({
    queryKey: ["admin", "books"],
    queryFn: () =>
      api.get<{ data?: AdminBook[] } | AdminBook[]>("/admin/books?pageSize=100", { token }).then((r) =>
        Array.isArray(r.data) ? r.data : (r.data.data ?? [])
      ),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/admin/books/${id}/${action}`, { token }),
    onSuccess: () => {
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "books"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/books/${id}`, { token }),
    onSuccess: () => {
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "books"] });
    },
  });

  const items = (list.data ?? []).filter((b) =>
    q.trim()
      ? `${b.title} ${b.subjectName} ${b.processingStatus} ${b.publicationStatus}`.toLowerCase().includes(q.trim().toLowerCase())
      : true
  );

  const ACTIONS = [
    { action: "process", label: "প্রসেস" },
    { action: "publish", label: "প্রকাশ" },
    { action: "unpublish", label: "অপ্রকাশ" },
    { action: "reindex", label: "রি-ইনডেক্স" },
    { action: "archive", label: "আর্কাইভ" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold">বই ব্যবস্থাপনা 📚</h1>
        <Link href="/admin/books/new"><Button size="sm">➕ নতুন বই</Button></Link>
      </div>
      <Input aria-label="বই খোঁজো" placeholder="শিরোনাম / বিষয় / অবস্থা দিয়ে খোঁজো…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      {list.isLoading && <SkeletonList rows={4} />}
      {list.isError && <EmptyState title="লোড হয়নি" message="আবার চেষ্টা করো।" action={<Button size="sm" variant="secondary" onClick={() => list.refetch()}>আবার চেষ্টা</Button>} />}
      <div className="overflow-x-auto rounded-lg border-2 border-ink bg-card shadow-pop">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink bg-muted">
              <th className="p-3">শিরোনাম</th>
              <th className="p-3">বিষয়</th>
              <th className="p-3">প্রসেসিং</th>
              <th className="p-3">প্রকাশনা</th>
              <th className="p-3">কাজ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="p-3 font-bold">
                  <Link href={`/admin/books/${b.id}`} className="text-accent underline">{b.title}</Link>
                  <span className="block text-xs font-normal text-mutedfg">{b.grade} · {b.curriculumName}</span>
                </td>
                <td className="p-3">{b.subjectName}</td>
                <td className="p-3"><Badge tone={statusTone(b.processingStatus)}>{b.processingStatus}</Badge></td>
                <td className="p-3"><Badge tone={statusTone(b.publicationStatus)}>{b.publicationStatus}</Badge></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.action}
                        onClick={() => setConfirm({ id: b.id, action: a.action, label: a.label })}
                        className="rounded-full border-2 border-ink bg-card px-2.5 py-1 text-xs font-bold hover:bg-tertiary"
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setConfirm({ id: b.id, action: "__delete", label: "মুছে ফেলো" })}
                      className="rounded-full border-2 border-ink bg-secondary px-2.5 py-1 text-xs font-bold text-white"
                    >
                      মুছো
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.action === "__delete") del.mutate(confirm.id);
          else act.mutate({ id: confirm.id, action: confirm.action });
        }}
        busy={act.isPending || del.isPending}
        title={`${confirm?.label} — নিশ্চিত?`}
        message="এই কাজটি বইয়ের অবস্থা বদলে দেবে। সফল হলেই সফল দেখানো হবে।"
        confirmLabel={confirm?.label ?? "নিশ্চিত"}
      />
    </div>
  );
}
