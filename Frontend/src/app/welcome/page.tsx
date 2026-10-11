"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { LoginCard } from "@/components/auth/LoginCard";
import { Button } from "@/components/ui/Button";
import { UserRound } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { startGuest } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function guest() {
    setError("");
    setBusy(true);
    try {
      await startGuest();
      router.push("/tutor");
    } catch {
      setError("অতিথি সেশন শুরু করা যায়নি। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dot-grid rounded-lg py-10">
      <LoginCard
        title="স্বাগতম! 🎉"
        subtitle="বই থেকে মজা করে শেখার বন্ধু"
        footer={
          <>
            <Link href="/login" className="font-bold text-accent underline">ইমেইলে সাইন ইন</Link>
            {" · "}
            <Link href="/signup" className="font-bold text-accent underline">নতুন অ্যাকাউন্ট</Link>
          </>
        }
      >
        <div className="space-y-3">
          <Link href="/login" className="block">
            <Button className="w-full">সাইন ইন করো</Button>
          </Link>
          <Button variant="secondary" className="w-full" onClick={guest} disabled={busy} icon={<UserRound size={18} strokeWidth={2.5} />}>
            {busy ? "…" : "অতিথি হয়ে চালিয়ে যাও"}
          </Button>
          {error && <p role="alert" className="text-sm font-bold text-secondary">{error}</p>}
          <div className="rounded-md border-2 border-dashed border-line p-3 text-xs text-mutedfg">
            <p className="font-bold text-foreground">অতিথি হিসেবে:</p>
            <p>• শুধু লিখে প্রশ্ন (দিনে সীমিত) • ইতিহাস সংরক্ষণ হয় না • ছবি/কণ্ঠের জন্য সাইন ইন লাগবে</p>
          </div>
        </div>
      </LoginCard>
    </div>
  );
}
