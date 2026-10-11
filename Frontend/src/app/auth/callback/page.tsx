"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Firebase redirect-flow landing: SDK resolves the result, then we route. */
export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/tutor"), 1200);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div className="grid place-items-center py-20 text-center">
      <div>
        <p className="font-display text-xl font-bold">সাইন ইন হচ্ছে… ⏳</p>
        <p className="text-mutedfg">একটু অপেক্ষা করো।</p>
      </div>
    </div>
  );
}
