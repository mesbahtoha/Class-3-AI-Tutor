"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import type { QuizPublic, QuizAttemptResult } from "@/lib/api/contracts";

/** Quiz: one question at a time, server-owned scoring, text+icon feedback. */
export function QuizCard({ quiz }: { quiz: QuizPublic }) {
  const { token } = useAuth();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  const q = quiz.questions[index];
  const submit = useMutation({
    mutationFn: () =>
      api.post<QuizAttemptResult>(`/tutor/quiz/${quiz.id}/attempts`, {
        token,
        body: { answers: quiz.questions.map((qq) => ({ questionId: qq.id, answer: answers[qq.id] ?? "" })) },
      }).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  });

  if (!q) return <p>এই কুইজে প্রশ্ন নেই।</p>;

  return (
    <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-sticker">
      <p className="font-display font-bold" aria-live="polite">প্রশ্ন {index + 1} / {quiz.questions.length}</p>
      <h3 className="mt-1 font-display text-xl font-bold">{q.prompt}</h3>

      {q.type === "mcq" && q.options ? (
        <div className="mt-3 grid gap-2" role="radiogroup" aria-label={q.prompt}>
          {q.options.map((o) => (
            <button
              key={o}
              role="radio"
              aria-checked={answers[q.id] === o}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
              className={`rounded-md border-2 px-3 py-2 text-left font-bold ${answers[q.id] === o ? "border-ink bg-tertiary" : "border-line bg-background hover:border-ink"}`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <input
          aria-label="উত্তর লেখো"
          value={answers[q.id] ?? ""}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          placeholder="উত্তর লেখো…"
          className="mt-3 w-full rounded-md border-2 border-line bg-white px-3 py-2 dark:bg-white/5"
        />
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button size="sm" variant="secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>আগে</Button>
        {index < quiz.questions.length - 1 ? (
          <Button size="sm" onClick={() => setIndex((i) => i + 1)}>পরে</Button>
        ) : (
          <Button size="sm" disabled={submit.isPending || !quiz.id} onClick={() => submit.mutate()}>
            {submit.isPending ? "পাঠানো হচ্ছে…" : "জমা দাও"}
          </Button>
        )}
      </div>

      {submit.isError && <p role="alert" className="mt-2 text-sm font-bold text-secondary">জমা দেওয়া যায়নি। আবার চেষ্টা করো।</p>}

      {result && (
        <div className="mt-4 rounded-md border-2 border-ink bg-muted p-3" aria-live="polite">
          <p className="font-display text-lg font-extrabold">
            {result.correct}/{result.total} ঠিক! {result.score >= 0.8 ? "🌟" : result.score >= 0.5 ? "💪" : "🌱"}
          </p>
          <p>{result.feedback}</p>
          <ul className="mt-2 space-y-1">
            {result.perQuestion.map((p) => (
              <li key={p.questionId} className="flex items-start gap-2 text-sm">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink ${p.correct ? "bg-quaternary" : "bg-secondary text-white"}`}>
                  {p.correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                </span>
                <span>
                  <b>{p.correct ? "ঠিক" : "ভুল"}</b> — {p.questionId}
                  {p.explanation ? `: ${p.explanation}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
