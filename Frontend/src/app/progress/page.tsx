"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface ProgressEntry {
  topicId: string;
  attempts: number;
  bestScore?: number | null;
  lastScore?: number | null;
}

export default function ProgressPage() {
  const { user, token } = useAuth();
  const q = useQuery({
    queryKey: ["progress"],
    enabled: !!user,
    queryFn: () => api.get<ProgressEntry[]>("/progress", { token }).then((r) => r.data),
  });

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="text-center">
          <h1 className="font-display text-xl font-extrabold">অগ্রগতি দেখতে সাইন ইন করো 📊</h1>
          <a href="/welcome" className="mt-3 inline-block"><Button size="sm">সাইন ইন</Button></a>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold">আমার অগ্রগতি 📊</h1>
      {q.isLoading && <SkeletonList rows={3} />}
      {q.isError && <EmptyState title="আনা যায়নি" message="আবার চেষ্টা করো।" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>আবার চেষ্টা</Button>} />}
      {q.data && q.data.length === 0 && (
        <EmptyState
          title="এখনো অনুশীলন হয়নি"
          message="প্রথম কুইজ দিলেই এখানে অগ্রগতি দেখা যাবে।"
          action={<Link href="/practice"><Button size="sm">অনুশীলন করো</Button></Link>}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(q.data ?? []).map((p) => (
          <Card key={p.topicId}>
            <CardBody>
              <h2 className="font-display text-lg font-bold">{p.topicId}</h2>
              <p className="text-sm text-mutedfg">চেষ্টা: {p.attempts} বার</p>
              {p.bestScore !== null && p.bestScore !== undefined && (
                <p className="text-sm">সেরা: {Math.round(p.bestScore * 100)}% 🎯</p>
              )}
              <p className="mt-1 text-sm font-bold text-quaternary">চলো {p.topicId} আরেকটু অনুশীলন করি! 💪</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
