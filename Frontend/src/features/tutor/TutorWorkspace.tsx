"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import { toFriendlyError } from "@/lib/api/errors";
import { useAuth } from "@/features/auth/AuthContext";
import { ChatMessage, type ChatTurn } from "@/components/chat/ChatMessage";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { TypingIndicator } from "@/components/chat/Citation";
import { ErrorState } from "@/components/ui/States";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select, Label } from "@/components/ui/Input";
import { ImageDialog } from "@/components/media/ImageDialog";
import { VoiceDialog } from "@/components/media/VoiceDialog";
import type { TutorChatResponse, LanguagePreference } from "@/lib/api/contracts";

let turnSeq = 0;
const nextId = () => `turn_${Date.now()}_${turnSeq++}`;

export function TutorWorkspace({ initialConversationId, bookId: fixedBookId }: {
  initialConversationId?: string;
  bookId?: string;
}) {
  const { token, isGuest, user, startGuest } = useAuth();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null);
  const [bookId, setBookId] = useState(fixedBookId ?? "");
  const [lang, setLang] = useState<LanguagePreference>(() => {
    try {
      return (localStorage.getItem("tutor_lang") as LanguagePreference) || "auto";
    } catch {
      return "auto";
    }
  });
  const [gate, setGate] = useState<null | "camera" | "voice">(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [chatError, setChatError] = useState<{ code: string; requestId?: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // Saved history (authenticated only; backend enforces ownership).
  const history = useQuery({
    queryKey: ["conversation", initialConversationId],
    enabled: !!initialConversationId && !!user,
    queryFn: () =>
      api.get<{ messages: Array<{ id: string; role: string; content: string }> }>(
        `/conversations/${initialConversationId}`,
        { token }
      ).then((r) => r.data),
  });

  useEffect(() => {
    if (history.data) {
      setTurns(
        history.data.messages.map((m) => ({
          id: m.id,
          role: m.role === "USER" ? "user" : "assistant",
          text: m.content,
        }))
      );
      setConversationId(initialConversationId ?? null);
    }
  }, [history.data, initialConversationId]);

  const chat = useMutation({
    mutationFn: async (text: string) => {
      setChatError(null);
      const { data } = await api.post<TutorChatResponse>("/tutor/chat", {
        token,
        body: {
          conversationId,
          message: text, // exact user text; never rewritten client-side
          languagePreference: lang,
          bookId: bookId || null,
          mode: "TUTOR",
        },
      });
      return data;
    },
    onSuccess: (data, text) => {
      if (data.conversationId) setConversationId(data.conversationId);
      setTurns((prev) => [...prev, { id: nextId(), role: "assistant", text: data.answer, response: data }]);
      void text;
    },
    onError: (err) => {
      const e = err as ApiError;
      setChatError({ code: e.code ?? "INTERNAL_ERROR", requestId: e.requestId });
      if (e.code === "QUOTA_EXCEEDED" || e.status === 401) {
        // keep turns; banner below explains + offers sign-in
      }
    },
  });

  function send(text: string) {
    if (!token) {
      // No credential yet → start guest automatically (text-only).
      startGuest().then(() => {
        setTurns((prev) => [...prev, { id: nextId(), role: "user", text }]);
        chat.mutate(text);
      }).catch(() => setChatError({ code: "NETWORK_ERROR" }));
      return;
    }
    setTurns((prev) => [...prev, { id: nextId(), role: "user", text }]);
    chat.mutate(text);
  }

  const friendly = chatError ? toFriendlyError(chatError.code, "", chatError.requestId) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Sidebar (drawer on mobile via details) */}
      <aside className="order-2 lg:order-1">
        <details className="rounded-lg border-2 border-ink bg-card shadow-pop lg:open" open={undefined}>
          <summary className="cursor-pointer p-3 font-display font-bold lg:hidden">⚙️ সেটিং ও ইতিহাস</summary>
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="lang">উত্তরের ভাষা</Label>
              <Select
                id="lang"
                value={lang}
                onChange={(e) => {
                  const v = e.target.value as LanguagePreference;
                  setLang(v);
                  try {
                    localStorage.setItem("tutor_lang", v);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <option value="auto">অটো (স্মার্ট)</option>
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
                <option value="banglish">Banglish</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="book">বই (ঐচ্ছিক)</Label>
              <input
                id="book"
                className="w-full rounded-md border-2 border-line bg-white px-3 py-2 dark:bg-white/5"
                placeholder="bookId দাও"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
              />
            </div>
            {isGuest && (
              <p className="rounded-md border-2 border-dashed border-line p-2 text-xs text-mutedfg">
                অতিথি মোড: শুধু লেখা, সীমিত প্রশ্ন। সংরক্ষণ, ছবি ও কণ্ঠের জন্য সাইন ইন করো।
              </p>
            )}
            <a href="/tutor" className="block text-center rounded-full border-2 border-ink px-4 py-2 font-bold hover:bg-muted">
              ✏️ নতুন চ্যাট
            </a>
          </div>
        </details>
      </aside>

      {/* Main panel */}
      <section className="order-1 lg:order-2" aria-label="টিউটর কথোপকথন">
        <div className="rounded-lg border-2 border-ink bg-card shadow-sticker">
          <div className="space-y-4 p-4 sm:p-5" aria-live="polite">
            {turns.length === 0 && !chat.isPending && (
              <div className="dot-grid rounded-md p-6 text-center">
                <p className="mx-auto grid size-16 place-items-center rounded-full border-2 border-ink bg-tertiary font-display text-4xl font-extrabold" aria-hidden>প</p>
                <h2 className="mt-2 font-display text-xl font-extrabold">আসসালামু আলাইকুম! 👋</h2>
                <p className="text-mutedfg">বইয়ের যেকোনো প্রশ্ন করো — নিচে লেখো বা উদাহরণ বেছে নাও।</p>
              </div>
            )}
            {turns.map((t) => (
              <ChatMessage
                key={t.id}
                turn={t}
                onPractice={(text) => send(`এই বিষয়ে একটা কুইজ দাও: ${text.slice(0, 120)}`)}
                onExplainAgain={(text) => send(`আরেকভাবে সহজ করে বোঝাও: ${text.slice(0, 120)}`)}
              />
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-none border-2 border-ink bg-card px-4 py-3 shadow-pop-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            {friendly && (
              <ErrorState error={friendly} onRetry={friendly.retryable ? () => setChatError(null) : undefined} />
            )}
            {chatError?.code === "QUOTA_EXCEEDED" && !user && (
              <a href="/welcome" className="block text-center"><Button size="sm">সাইন ইন করে আরও শেখো</Button></a>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t-2 border-ink bg-background/60 p-3 sm:p-4">
            <ChatComposer
              onSend={send}
              busy={chat.isPending}
              canMedia={!!user}
              onMediaGate={(kind) => setGate(kind)}
              onImage={() => setImgOpen(true)}
              onVoice={() => setVoiceOpen(true)}
            />
          </div>
        </div>
      </section>

      <Dialog open={gate !== null} onClose={() => setGate(null)} title="সাইন ইন করো 🔑">
        <p>
          {gate === "camera" ? "ছবি দিয়ে প্রশ্ন" : "কণ্ঠে প্রশ্ন"} করতে সাইন ইন লাগবে।
          অতিথিরা শুধু লিখে প্রশ্ন করতে পারে।
        </p>
        <div className="mt-4 flex gap-2">
          <a href="/welcome" className="flex-1"><Button className="w-full" size="sm">সাইন ইন / অতিথি তথ্য</Button></a>
        </div>
      </Dialog>

      <ImageDialog open={imgOpen} onClose={() => setImgOpen(false)} onAnswered={(text, response) => {
        setTurns((prev) => [...prev, { id: nextId(), role: "assistant", text, response }]);
      }} />
      <VoiceDialog open={voiceOpen} onClose={() => setVoiceOpen(false)} onTranscript={(text) => send(text)} />
    </div>
  );
}
