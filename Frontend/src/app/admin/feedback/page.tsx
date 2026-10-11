"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface FeedbackItem {
  id: string;
  rating?: number | null;
  comment?: string | null;
  reportType?: string | null;
  status: string;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const { token } = useAuth();
  const q = useQuery({
    queryKey: ["admin", "feedback"],
    queryFn: () => api.get<FeedbackItem[]>("/admin/feedback", { token }).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">ফিডব্যাক 💬</h1>
      {q.isLoading && <SkeletonList rows={3} />}
      {q.isError && <EmptyState title="লোড হয়নি" message="আবার চেষ্টা করো।" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>আবার চেষ্টা</Button>} />}
      {q.data && q.data.length === 0 && <EmptyState title="ফিডব্যাক নেই" message="শিক্ষার্থীরা রেটিং দিলে এখানে দেখা যাবে।" />}
      <div className="space-y-2">
        {(q.data ?? []).map((f) => (
          <div key={f.id} className="rounded-lg border-2 border-ink bg-card p-3 shadow-pop-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={f.rating && f.rating >= 4 ? "green" : "amber"}>⭐ {f.rating ?? "—"}</Badge>
              {f.reportType && <Badge tone="pink">{f.reportType}</Badge>}
              <Badge tone="gray">{f.status}</Badge>
            </div>
            {f.comment && <p className="mt-1">{f.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
