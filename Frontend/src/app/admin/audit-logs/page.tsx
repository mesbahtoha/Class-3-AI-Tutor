"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface AuditItem {
  id: string;
  action: string;
  target?: string | null;
  requestId?: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { token } = useAuth();
  const q = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => api.get<AuditItem[]>("/admin/audit-logs", { token }).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">অডিট লগ 📋</h1>
      <p className="text-sm text-mutedfg">শুধু পড়া যাবে — টোকেন বা গোপন তথ্য এখানে দেখানো হয় না।</p>
      {q.isLoading && <SkeletonList rows={3} />}
      {q.isError && <EmptyState title="লোড হয়নি" message="আবার চেষ্টা করো।" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>আবার চেষ্টা</Button>} />}
      <div className="overflow-x-auto rounded-lg border-2 border-ink bg-card shadow-pop">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink bg-muted">
              <th className="p-3">কাজ</th>
              <th className="p-3">লক্ষ্য</th>
              <th className="p-3">সময়</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="p-3 font-bold">{a.action}</td>
                <td className="p-3">{a.target?.slice(0, 12) ?? "—"}</td>
                <td className="p-3 text-mutedfg">{new Date(a.createdAt).toLocaleString("bn-BD")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
