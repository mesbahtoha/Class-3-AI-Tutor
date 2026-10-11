"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonList, EmptyState } from "@/components/ui/States";

/** Usage: only backend-returned metrics. No fake zeros. */
export default function UsagePage() {
  const { token } = useAuth();
  const q = useQuery({
    queryKey: ["admin", "usage"],
    queryFn: () => api.get<{ total: number; byProvider: Array<{ provider: string; model: string; _count: { _all: number } }>; recentErrors: Array<{ id: string; operation: string; status: string; createdAt: string }> }>("/admin/usage", { token }).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">ব্যবহার 📈</h1>
      {q.isLoading && <SkeletonList rows={3} />}
      {q.isError && <EmptyState title="লোড হয়নি" message="আবার চেষ্টা করো।" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>আবার চেষ্টা</Button>} />}
      {q.data && (
        <>
          <Card><CardBody><p className="font-display text-3xl font-extrabold">{q.data.total}</p><p className="text-mutedfg">মোট অনুরোধ (লগ)</p></CardBody></Card>
          <Card>
            <CardBody>
              <h2 className="font-display font-bold">প্রোভাইডার অনুযায়ী</h2>
              {q.data.byProvider.length === 0 && <p className="text-sm text-mutedfg">তথ্য নেই।</p>}
              <ul className="mt-2 space-y-1">
                {q.data.byProvider.map((b) => (
                  <li key={`${b.provider}/${b.model}`} className="text-sm">🔹 {b.provider}/{b.model}: <b>{b._count._all}</b></li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="font-display font-bold">সাম্প্রতিক ত্রুটি</h2>
              {q.data.recentErrors.length === 0 && <p className="text-sm text-mutedfg">কোনো ত্রুটি নেই। 🎉</p>}
              <ul className="mt-2 space-y-1">
                {q.data.recentErrors.map((e) => (
                  <li key={e.id} className="text-sm">⚠️ {e.operation} — {e.status}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
