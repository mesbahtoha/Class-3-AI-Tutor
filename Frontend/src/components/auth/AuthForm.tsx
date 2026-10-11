"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Chrome } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { toFriendlyError } from "@/lib/api/errors";

const schema = z.object({
  email: z.string().email("সঠিক ইমেইল লেখো"),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"),
});

type Form = z.infer<typeof schema>;

function firebaseError(code: string): string {
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
    return "ইমেইল বা পাসওয়ার্ড মিলছে না।";
  if (code.includes("email-already-in-use")) return "এই ইমেইলে আগেই অ্যাকাউন্ট আছে — সাইন ইন করো।";
  if (code.includes("popup-closed-by-user")) return "পপআপ বন্ধ হয়ে গেছে। আবার চেষ্টা করো।";
  if (code.includes("network-request-failed")) return "ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।";
  return "সাইন ইন করা যায়নি। আবার চেষ্টা করো।";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const auth = firebaseAuth();
  if (!auth) {
    const fe = toFriendlyError("SERVICE_UNAVAILABLE", "", undefined);
    return (
      <div role="alert" className="rounded-md border-2 border-ink bg-card p-4">
        <p className="font-bold">{fe.title}</p>
        <p>Firebase সেটআপ হয়নি (.env দেখো)।</p>
      </div>
    );
  }

  async function google() {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth!, new GoogleAuthProvider());
      router.push("/tutor");
    } catch (e) {
      setError(firebaseError((e as { code?: string })?.code ?? ""));
    } finally {
      setBusy(false);
    }
  }

  async function submit(values: Form) {
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth!, values.email, values.password);
      } else {
        await createUserWithEmailAndPassword(auth!, values.email, values.password);
      }
      router.push("/tutor");
    } catch (e) {
      setError(firebaseError((e as { code?: string })?.code ?? ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={google} disabled={busy} className="w-full" icon={<Chrome size={18} strokeWidth={2.5} />}>
        Google দিয়ে চালিয়ে যাও
      </Button>
      <div className="flex items-center gap-2 text-sm text-mutedfg" aria-hidden>
        <span className="h-0.5 flex-1 rounded bg-line" />
        অথবা ইমেইলে
        <span className="h-0.5 flex-1 rounded bg-line" />
      </div>
      <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
        <div>
          <Label htmlFor="email">ইমেইল (অভিভাবকের)</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="baba@example.com" {...register("email")} />
          {errors.email && <p role="alert" className="mt-1 text-sm font-bold text-secondary">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">পাসওয়ার্ড</Label>
          <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••" {...register("password")} />
          {errors.password && <p role="alert" className="mt-1 text-sm font-bold text-secondary">{errors.password.message}</p>}
        </div>
        {error && <p role="alert" className="rounded-md border-2 border-ink bg-secondary/15 p-3 text-sm font-bold">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full" icon={<Mail size={18} strokeWidth={2.5} />}>
          {busy ? "…" : mode === "login" ? "সাইন ইন" : "অ্যাকাউন্ট খোলো"}
        </Button>
      </form>
      <p className="flex items-center gap-1 text-xs text-mutedfg">
        <Lock size={14} strokeWidth={2.5} /> পাসওয়ার্ড শুধু Firebase-এ যায় — আমাদের সার্ভারে নয়।
      </p>
    </div>
  );
}
