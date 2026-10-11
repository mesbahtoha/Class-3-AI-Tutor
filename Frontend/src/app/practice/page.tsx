"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api/client";
import { QuizCard } from "@/components/quizzes/QuizCard";
import { LessonGenerator } from "@/components/lessons/LessonGenerator";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import type { QuizPublic } from "@/lib/api/contracts";

export default function PracticePage() {
  const { token, user } = useAuth();
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState<QuizPublic | null>(null);

  const gen = useMutation({
    mutationFn: () =>
      api.post<QuizPublic>("/tutor/quiz", { token, body: { topic, numQuestions: 5 } }).then((r) => r.data),
    onSuccess: (data) => setQuiz(data),
  });

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="text-center">
          <h1 className="font-display text-xl font-extrabold">অনুশীলন করতে সাইন ইন করো 🔑</h1>
          <p className="text-mutedfg">কুইজ আর অগ্রগতি সংরক্ষণের জন্য অ্যাকাউন্ট লাগবে।</p>
          <a href="/welcome" className="mt-3 inline-block"><Button size="sm">সাইন ইন</Button></a>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold">অনুশীলন ✏️</h1>
      <Card>
        <CardBody>
          <Label htmlFor="quiz-topic">কোন বিষয়ে কুইজ চাও?</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="quiz-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="যেমন: যোগ" className="flex-1" />
            <Button disabled={!topic.trim() || gen.isPending} onClick={() => gen.mutate()}>
              {gen.isPending ? "বানানো হচ্ছে…" : "কুইজ বানাও"}
            </Button>
          </div>
          {gen.isError && <p role="alert" className="mt-2 font-bold text-secondary">কুইজ বানানো যায়নি। আবার চেষ্টা করো।</p>}
        </CardBody>
      </Card>
      {gen.isPending && <Skeleton className="h-64 w-full" />}
      {quiz && (
        <div>
          <h2 className="mb-2 font-display text-xl font-extrabold">{quiz.title}</h2>
          <QuizCard quiz={quiz} />
        </div>
      )}
      <div>
        <h2 className="mb-2 font-display text-xl font-extrabold">অথবা পাঠ থেকে শেখো 📖</h2>
        <LessonGenerator />
      </div>
    </div>
  );
}
