"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Route error:", error.message);
  }, [error]);
  return (
    <div className="grid place-items-center py-20 text-center">
      <div>
        <p className="font-display text-6xl font-extrabold">🔌</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">কিছু একটা সমস্যা হয়েছে</h1>
        <p className="text-mutedfg">আবার চেষ্টা করো।</p>
        <Button variant="secondary" onClick={reset} className="mt-4">আবার চেষ্টা করো</Button>
      </div>
    </div>
  );
}
