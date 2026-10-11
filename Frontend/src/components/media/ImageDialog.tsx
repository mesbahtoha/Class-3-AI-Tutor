"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Upload, Trash2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { TutorChatResponse } from "@/lib/api/contracts";

/**
 * Image question (auth only, explicit action first):
 * preview → retake/remove → upload → transcription confirm → tutor answer.
 * Local object URLs are revoked on close (no long-lived browser storage).
 */
export function ImageDialog({ open, onClose, onAnswered }: {
  open: boolean;
  onClose: () => void;
  onAnswered: (text: string, response: TutorChatResponse) => void;
}) {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setFile(null);
      setHint("");
      setError("");
    }
  }, [open, preview]);

  function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("শুধু JPEG, PNG বা WebP ছবি দাও।");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("ছবিটা ১০MB-এর কম হতে হবে।");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const ask = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("no file");
      const fd = new FormData();
      fd.append("image", file);
      if (hint.trim()) fd.append("message", hint.trim());
      const { data } = await api.post<{ transcription?: string } & TutorChatResponse>("/media/image-question", { token, form: fd });
      return data;
    },
    onSuccess: (data) => {
      if (data.transcription === "" || (data as { needsConfirmation?: boolean }).needsConfirmation) {
        setError("ছবির লেখা পড়া যায়নি — প্রশ্নটা লিখে দাও, বুঝিয়ে দিচ্ছি! 🌱");
        return;
      }
      onAnswered(data.answer ?? "", data as TutorChatResponse);
      onClose();
    },
    onError: () => setError("ছবি পাঠানো যায়নি। আবার চেষ্টা করো।"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="ছবি দিয়ে প্রশ্ন 📷">
      <p className="text-sm text-mutedfg">ছবিটা উত্তর বোঝাতে পাঠানো হবে। মুখের ছবি দিও না।</p>
      <div className="mt-3 flex gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-ink bg-tertiary px-4 py-2 font-bold">
          <Camera size={18} strokeWidth={2.5} /> ছবি তোলো
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-ink bg-card px-4 py-2 font-bold hover:bg-muted">
          <Upload size={18} strokeWidth={2.5} /> আপলোড
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      {preview && (
        <div className="relative mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="প্রশ্নের ছবির প্রিভিউ" className="max-h-56 w-full rounded-md border-2 border-ink object-contain" />
          <button
            aria-label="ছবি সরাও"
            onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null); }}
            className="absolute right-2 top-2 grid size-9 place-items-center rounded-full border-2 border-ink bg-secondary text-white"
          >
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
      <input
        aria-label="ইঙ্গিত (ঐচ্ছিক)"
        placeholder="ইঙ্গিত লেখো (ঐচ্ছিক)"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        className="mt-3 w-full rounded-md border-2 border-line bg-white px-3 py-2 dark:bg-white/5"
      />
      {error && <p role="alert" className="mt-2 text-sm font-bold text-secondary">{error}</p>}
      <div className="mt-4">
        <Button className="w-full" size="sm" disabled={!file || ask.isPending} onClick={() => ask.mutate()}>
          {ask.isPending ? "পাঠানো হচ্ছে…" : "টিউটরকে জিজ্ঞেস করো"}
        </Button>
      </div>
    </Dialog>
  );
}
