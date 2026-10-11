"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface Job {
  id: string;
  bookId: string;
  status: string;
  progress: number;
  attempts: number;
  errorCode?: string | null;
  errorDetail?: string | null;
  createdAt: string;
}

export default function IngestionJobsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => api.get<Job[]>("/admin/ingestion-jobs", { token }).then((r) => r.data),
    refetchInterval: 8000,
  });

  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/admin/ingestion-jobs/${id}/retry`, { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">প্রসেসিং কাজ ⚙️</h1>
      {list.isLoading && <SkeletonList rows={3} />}
      {list.isError && <EmptyState title="লোড হয়নি" message="আবার চেষ্টা করো।" />}
      <div className="space-y-2">
        {(list.data ?? []).map((j) => (
          <div key={j.id} className="rounded-lg border-2 border-ink bg-card p-3 shadow-pop-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(j.status)}>{j.status}</Badge>
              <span className="font-bold">{j.progress}%</span>
              <span className="text-xs text-mutedfg">চেষ্টা {j.attempts} · বই {j.bookId.slice(0, 8)}…</span>
              {j.status === "FAILED" && (
                <Button size="sm" variant="secondary" disabled={retry.isPending} onClick={() => retry.mutate(j.id)}>
                  আবার চালাও
                </Button>
              )}
            </div>
            {j.errorCode && <p className="mt-1 text-sm font-bold text-secondary">{j.errorCode}</p>}
            {j.errorDetail && <p className="mt-1 text-sm text-mutedfg">{j.errorDetail.slice(0, 300)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
