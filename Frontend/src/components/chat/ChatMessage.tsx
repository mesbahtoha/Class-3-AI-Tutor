"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Sparkles, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { SourceCitation } from "@/components/chat/Citation";
import { Badge } from "@/components/ui/Badge";
import type { TutorChatResponse } from "@/lib/api/contracts";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: TutorChatResponse;
}

function statusBadge(status: TutorChatResponse["answerStatus"]) {
  if (status === "ANSWERED") return <Badge tone="green">✅ উত্তর তৈরি</Badge>;
  if (status === "INSUFFICIENT_BOOK_CONTEXT") return <Badge tone="amber">📖 বইয়ে পাইনি</Badge>;
  return <Badge tone="amber">❓ আরেকটু বলো</Badge>;
}

/** One chat bubble. User text shown EXACTLY as typed (no Banglish rewriting). */
export function ChatMessage({ turn, onPractice, onExplainAgain }: {
  turn: ChatTurn;
  onPractice?: (text: string) => void;
  onExplainAgain?: (text: string) => void;
}) {
  const { token } = useAuth();
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  const vote = useMutation({
    mutationFn: (rating: number) =>
      api.post("/feedback", { token, body: { messageId: turn.response?.messageId, rating } }),
    onSuccess: (_, rating) => setVoted(rating >= 4 ? "up" : "down"),
  });

  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none border-2 border-ink bg-accent px-4 py-2.5 font-medium text-white shadow-pop-sm">
          {turn.text}
        </div>
      </div>
    );
  }

  const r = turn.response;
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-none border-2 border-ink bg-card px-4 py-3 shadow-pop-sm">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full border-2 border-ink bg-tertiary font-display font-extrabold" aria-hidden>প</span>
          {r && statusBadge(r.answerStatus)}
        </div>
        <p className="whitespace-pre-wrap">{turn.text}</p>
        {r && <SourceCitation sources={r.sources} />}
        {r?.followUpQuestion && (
          <p className="mt-2 rounded-md bg-muted p-2 text-sm">
            <span className="font-bold">🤔 </span>{r.followUpQuestion}
          </p>
        )}
        {r && r.answerStatus === "ANSWERED" && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onPractice?.(turn.text)}
              className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-quaternary px-3 py-1 text-xs font-bold"
            >
              <Sparkles size={14} strokeWidth={2.5} /> অনুশীলন
            </button>
            <button
              onClick={() => onExplainAgain?.(turn.text)}
              className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-tertiary px-3 py-1 text-xs font-bold"
            >
              <RefreshCw size={14} strokeWidth={2.5} /> আবার বোঝাও
            </button>
            <span className="inline-flex items-center gap-1 text-xs">
              <button aria-label="সহায়ক" disabled={voted !== null || vote.isPending} onClick={() => vote.mutate(5)} className="rounded-full border-2 border-ink p-1 hover:bg-quaternary disabled:opacity-50">
                <ThumbsUp size={14} strokeWidth={2.5} />
              </button>
              <button aria-label="সহায়ক নয়" disabled={voted !== null || vote.isPending} onClick={() => vote.mutate(2)} className="rounded-full border-2 border-ink p-1 hover:bg-secondary hover:text-white disabled:opacity-50">
                <ThumbsDown size={14} strokeWidth={2.5} />
              </button>
              {voted && <span className="text-mutedfg">ধন্যবাদ! 💛</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
