"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { Skeleton, EmptyState } from "@/components/ui/States";
import type { LessonPlan } from "@/lib/api/contracts";

export default function LearnPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { token } = useAuth();
  // Backend serves lessons via generation; deep-link fetch falls back gracefully.
  const q = useQuery({
    queryKey: ["lesson", lessonId],
    enabled: false,
    queryFn: () => api.get<LessonPlan>(`/lessons/${lessonId}`, { token }).then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/tutor" className="font-bold text-accent underline">← টিউটরে ফিরে যাও</Link>
      <h1 className="font-display text-2xl font-extrabold">পাঠ 🎬</h1>
      {q.isLoading && <Skeleton className="h-56 w-full" />}
      {q.data ? (
        <LessonPlayer lesson={q.data} />
      ) : (
        <EmptyState
          title="পাঠ এখানে খুলবে"
          message="টিউটর থেকে ‘পাঠ বানাও’ চাপলে স্লাইড এখানে দেখা যাবে।"
        />
      )}
    </div>
  );
}
