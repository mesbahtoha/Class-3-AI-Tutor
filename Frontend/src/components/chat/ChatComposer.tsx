"use client";

import { useRef, useState } from "react";
import { Send, Camera, Mic } from "lucide-react";

const MAX_LEN = 2000;
const EXAMPLES = [
  "ভগ্নাংশ কী? সহজ করে বোঝাও",
  "Explain a plant's life cycle",
  "vognangsho ki? example dao",
  "আমাকে ৫টা গণিতের practice question দাও",
];

/** Composer: Enter-to-send, Shift+Enter newline, char budget, gated media buttons. */
export function ChatComposer({
  onSend,
  busy,
  canMedia,
  onMediaGate,
  onImage,
  onVoice,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  canMedia: boolean;
  onMediaGate: (kind: "camera" | "voice") => void;
  onImage: () => void;
  onVoice: () => void;
}) {
  const [value, setValue] = useState("");
  const [showExamples, setShowExamples] = useState(true);
  const sentRef = useRef(false);

  function send() {
    const text = value.trim();
    if (!text || busy || sentRef.current) return; // prevent duplicate taps
    sentRef.current = true;
    onSend(text);
    setValue("");
    setShowExamples(false);
    setTimeout(() => {
      sentRef.current = false;
    }, 800);
  }

  return (
    <div>
      {showExamples && (
        <div className="mb-2 flex flex-wrap gap-2" aria-label="উদাহরণ প্রশ্ন">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setValue(ex);
                setShowExamples(false);
              }}
              className="rounded-full border-2 border-ink bg-card px-3 py-1.5 text-sm font-bold shadow-pop-sm hover:bg-tertiary"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-lg border-2 border-ink bg-card p-2 shadow-pop">
        <label htmlFor="composer" className="sr-only">প্রশ্ন লেখো</label>
        <textarea
          id="composer"
          rows={2}
          maxLength={MAX_LEN}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="বাংলা, English বা বাংলিশে প্রশ্ন লেখো…"
          className="w-full resize-none bg-transparent px-2 py-1 outline-none placeholder:text-mutedfg"
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex gap-1">
            <button
              aria-label="ছবি দিয়ে প্রশ্ন"
              title={canMedia ? "ছবি দিয়ে প্রশ্ন" : "সাইন ইন করলে ছবি দেওয়া যাবে"}
              onClick={() => (canMedia ? onImage() : onMediaGate("camera"))}
              className="grid size-11 place-items-center rounded-full border-2 border-ink bg-card hover:bg-tertiary"
            >
              <Camera size={20} strokeWidth={2.5} />
            </button>
            <button
              aria-label="বলে প্রশ্ন করো"
              title={canMedia ? "বলে প্রশ্ন করো" : "সাইন ইন করলে বলা যাবে"}
              onClick={() => (canMedia ? onVoice() : onMediaGate("voice"))}
              className="grid size-11 place-items-center rounded-full border-2 border-ink bg-card hover:bg-tertiary"
            >
              <Mic size={20} strokeWidth={2.5} />
            </button>
          </div>
          <span className="text-xs text-mutedfg" aria-live="polite">{MAX_LEN - value.length}</span>
          <button
            onClick={send}
            disabled={!value.trim() || busy}
            aria-label="পাঠাও"
            className="btn-pop grid size-12 place-items-center rounded-full border-2 border-ink bg-accent text-white shadow-pop hover:shadow-pop-lg active:shadow-pop-sm disabled:opacity-50"
          >
            <Send size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
