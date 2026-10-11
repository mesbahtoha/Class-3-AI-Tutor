"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";
import type { LessonPlan } from "@/lib/api/contracts";

/** Generate + play a structured lesson (auth). Validated JSON → safe renderer. */
export function LessonGenerator({ initialTopic = "" }: { initialTopic?: string }) {
  const { token } = useAuth();
  const [topic, setTopic] = useState(initialTopic);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);

  const gen = useMutation({
    mutationFn: () =>
      api.post<LessonPlan>("/tutor/lesson", { token, body: { topic, languagePreference: "auto" } }).then((r) => r.data),
    onSuccess: (data) => setLesson(data),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="lesson-topic">কোন বিষয়ে পাঠ চাও?</Label>
          <Input id="lesson-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="যেমন: ভগ্নাংশ" />
        </div>
        <div className="flex items-end">
          <Button disabled={!topic.trim() || gen.isPending} onClick={() => gen.mutate()}>
            {gen.isPending ? "বানানো হচ্ছে…" : "পাঠ বানাও ✨"}
          </Button>
        </div>
      </div>
      {gen.isPending && <Skeleton className="h-56 w-full" />}
      {gen.isError && <p role="alert" className="font-bold text-secondary">পাঠ বানানো যায়নি। আবার চেষ্টা করো।</p>}
      {lesson && (
        <div>
          <h3 className="mb-2 font-display text-xl font-extrabold">{lesson.title}</h3>
          <LessonPlayer lesson={lesson} />
        </div>
      )}
    </div>
  );
}
