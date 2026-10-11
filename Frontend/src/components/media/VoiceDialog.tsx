"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Square, Play, Trash2, Send } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

/**
 * Press-to-talk (auth only): permission asked on Record tap → indicator +
 * elapsed → Stop/Cancel → transcript REVIEW stage → confirmed text goes to
 * the tutor. Audio blobs are never stored; TTS never autoplays.
 */
export function VoiceDialog({ open, onClose, onTranscript }: {
  open: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}) {
  const { token } = useAuth();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [speakUrl, setSpeakUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (speakUrl) URL.revokeObjectURL(speakUrl);
    setSpeakUrl(null);
  }

  useEffect(() => {
    if (!open) {
      cleanup();
      setRecording(false);
      setSeconds(0);
      setTranscript("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("এই ব্রাউজারে মাইক্রোফোন চলবে না। লিখে প্রশ্ন করো।");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        transcribe.mutate(blob);
      };
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("মাইক্রোফোনের অনুমতি পাইনি। সেটিংসে অনুমতি দিয়ে আবার চেষ্টা করো।");
    }
  }

  function stop(discard = false) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    if (discard) {
      chunksRef.current = [];
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      cleanup();
      setTranscript("");
      return;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      setError("রেকর্ডিং থামানো যায়নি।");
    }
  }

  const transcribe = useMutation({
    mutationFn: async (blob: Blob) => {
      const fd = new FormData();
      fd.append("audio", blob, "question.webm");
      const { data } = await api.post<{ transcript: string; note?: string }>("/voice/transcribe", { token, form: fd });
      return data;
    },
    onSuccess: (data) => {
      if (!data.transcript) {
        setError(data.note ?? "কথা বোঝা যায়নি। আবার বলো বা লিখে দাও।");
        return;
      }
      setTranscript(data.transcript);
    },
    onError: () => setError("পাঠানো যায়নি। আবার চেষ্টা করো।"),
  });

  const speak = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<{ audioBase64: string | null; mimeType: string; note?: string }>(
        "/voice/speak",
        { token, body: { text: text.slice(0, 2000), language: "bn" } }
      );
      return data;
    },
    onSuccess: (data) => {
      if (!data.audioBase64) {
        setError(data.note ?? "কণ্ঠ এখনো চালু হয়নি।");
        return;
      }
      if (speakUrl) URL.revokeObjectURL(speakUrl);
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0))], { type: data.mimeType })
      );
      setSpeakUrl(url);
    },
    onError: () => setError("শোনানো যায়নি।"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="বলে প্রশ্ন করো 🎙️">
      <div className="text-center" aria-live="polite">
        {!recording && !transcript && (
          <button
            onClick={start}
            aria-label="রেকর্ড শুরু"
            className="btn-pop mx-auto grid size-20 place-items-center rounded-full border-2 border-ink bg-secondary text-white shadow-pop"
          >
            <Mic size={32} strokeWidth={2.5} />
          </button>
        )}
        {recording && (
          <div>
            <p className="font-display text-xl font-extrabold text-secondary" role="status">● রেকর্ড হচ্ছে… {seconds}s</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button size="sm" onClick={() => stop(false)} icon={<Square size={16} strokeWidth={2.5} />}>থামো</Button>
              <Button size="sm" variant="secondary" onClick={() => stop(true)} icon={<Trash2 size={16} strokeWidth={2.5} />}>বাতিল</Button>
            </div>
          </div>
        )}
        {transcribe.isPending && <p className="mt-3">শোনা হচ্ছে… ⏳</p>}
        {transcript && (
          <div className="mt-3 rounded-md border-2 border-ink bg-muted p-3 text-left">
            <p className="text-xs font-bold text-mutedfg">যা শুনলাম — ঠিক আছে?</p>
            <p className="font-bold">{transcript}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { onTranscript(transcript); onClose(); }} icon={<Send size={16} strokeWidth={2.5} />}>
                টিউটরকে পাঠাও
              </Button>
              <Button size="sm" variant="secondary" onClick={() => speak.mutate(transcript)} icon={<Play size={16} strokeWidth={2.5} />}>
                শুনে দেখো
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setTranscript(""); }}>আবার বলো</Button>
            </div>
            {speakUrl && <audio src={speakUrl} controls className="mt-2 w-full" />}
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-sm font-bold text-secondary">{error}</p>}
      </div>
    </Dialog>
  );
}
