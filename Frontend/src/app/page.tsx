"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Camera, Mic, Shapes, PenLine, BadgeCheck, MessageCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SkeletonList, EmptyState } from "@/components/ui/States";
import type { BookPublic } from "@/lib/api/contracts";

const bounce = { type: "spring", stiffness: 260, damping: 18 } as const;

function Hero() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden rounded-lg border-2 border-ink bg-card shadow-sticker">
      <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="absolute -left-16 -top-16 size-56 rounded-full bg-tertiary" aria-hidden />
      <div className="absolute -bottom-20 -right-10 size-64 rounded-full bg-secondary/70" aria-hidden />
      <div className="absolute right-10 top-8 size-10 rotate-12 rounded-md bg-quaternary" aria-hidden />
      <div className="relative grid gap-6 p-6 sm:p-10 md:grid-cols-2 md:items-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bounce}>
          <span className="inline-block rounded-full border-2 border-ink bg-quaternary px-4 py-1 text-sm font-bold">
            তৃতীয় শ্রেণি · বাংলা + English + Banglish
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            বই থেকে শেখো,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">একটু একটু করে</span>
              <svg className="absolute -bottom-2 left-0 z-0 w-full" viewBox="0 0 120 12" aria-hidden>
                <path d="M2 8 Q 30 2 60 7 T 118 5" fill="none" stroke="#F472B6" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>{" "}
            মজা করে! 🎈
          </h1>
          <p className="mt-4 max-w-md text-lg">
            তোমার পাঠ্যবই থেকে সহজ ব্যাখ্যা, ছবির মতো স্লাইড আর মজার কুইজ — বাংলায়, ইংরেজিতে, এমনকি বাংলিশেও প্রশ্ন করো।
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={user ? "/tutor" : "/welcome"}>
              <Button size="lg" icon={<ArrowRight size={18} strokeWidth={2.5} />}>শেখা শুরু করো</Button>
            </Link>
            <Link href="/books">
              <Button size="lg" variant="secondary">বই দেখো</Button>
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...bounce, delay: 0.12 }}
          className="relative mx-auto w-full max-w-sm"
          aria-hidden
        >
          <div className="stripes absolute -inset-3 rounded-lg" />
          <div className="relative rounded-t-full rounded-b-lg border-2 border-ink bg-tertiary p-6 pt-10 shadow-pop-lg">
            <div className="mx-auto grid size-28 place-items-center rounded-full border-2 border-ink bg-card font-display text-6xl font-extrabold shadow-pop">
              অ
            </div>
            <div className="mx-auto mt-4 max-w-[240px] rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-none border-2 border-ink bg-card p-3 shadow-pop-sm">
              <p className="font-bold">ভগ্নাংশ কী? 🤔</p>
            </div>
            <div className="mx-auto mt-2 max-w-[240px] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none border-2 border-ink bg-quaternary p-3 font-bold shadow-pop-sm">
              <p>রুটির সমান ভাগ! 🍞 ➗</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const words = ["ভগ্নাংশ", "Fractions", "যোগ", "Addition", "ত্রিভুজ", "গণিত", "Practice", "বাংলা"];
  const row = [...words, ...words];
  return (
    <div className="overflow-hidden rounded-full border-2 border-ink bg-ink py-2 text-background" aria-hidden>
      <div className="animate-marquee flex w-max gap-6 whitespace-nowrap font-display font-bold">
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-6">
            {w} <span className="text-tertiary">★</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SubjectCards() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["books", "home"],
    queryFn: () => api.get<BookPublic[]>("/books").then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-extrabold">বই থেকে বেছে নাও 📚</h2>
      <p className="text-mutedfg">প্রকাশিত বইগুলো এখানে দেখা যাবে — যা API দেবে, শুধু তা-ই।</p>
      <div className="mt-4">
        {isLoading && <SkeletonList rows={3} />}
        {isError && (
          <EmptyState
            title="বই আনা যায়নি"
            message="ইন্টারনেট দেখে আবার চেষ্টা করো।"
            action={<Button size="sm" variant="secondary" onClick={() => refetch()}>আবার চেষ্টা</Button>}
          />
        )}
        {data && data.length === 0 && (
          <EmptyState title="এখনো বই নেই" message="অ্যাডমিন প্রথম বই প্রকাশ করলে এখানে দেখা যাবে।" />
        )}
        {data && data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.slice(0, 6).map((b, i) => (
              <Link key={b.id} href={`/books/${b.id}`}>
                <Card featured={i === 0}>
                  <CardBody>
                    <div className={`mb-3 grid size-12 place-items-center rounded-full border-2 border-ink ${i % 3 === 0 ? "bg-accent text-white" : i % 3 === 1 ? "bg-secondary text-white" : "bg-tertiary text-ink"}`}>
                      <BookOpen size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-display text-lg font-bold">{b.title}</h3>
                    <p className="text-sm text-mutedfg">{b.subjectName} · {b.grade} · {b.language}</p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: PenLine, color: "bg-accent text-white", title: "১. প্রশ্ন করো", text: "বাংলা, English বা বাংলিশে — যেভাবে খুশি লেখো।" },
  { icon: BookOpen, color: "bg-secondary text-white", title: "২. বুঝে নাও", text: "বইয়ের পাতা-সহ সহজ ব্যাখ্যা পাও।" },
  { icon: BadgeCheck, color: "bg-tertiary text-ink", title: "৩. অনুশীলন করো", text: "কুইজ দাও, ভুল হলে আবার বুঝে নাও।" },
];

const MODES = [
  { icon: MessageCircle, color: "bg-accent", title: "টেক্সট টিউটর", text: "অতিথি বা সাইন-ইন — লিখে প্রশ্ন করো।", href: "/tutor" },
  { icon: Shapes, color: "bg-secondary", title: "ছবির স্লাইড", text: "পাঠ ধাপে ধাপে সাজানো স্লাইডে দেখো।", href: "/tutor" },
  { icon: Mic, color: "bg-tertiary", title: "কণ্ঠ", text: "বলে প্রশ্ন, শুনে উত্তর (সাইন-ইন)।", href: "/tutor" },
  { icon: Camera, color: "bg-quaternary", title: "ক্যামেরা প্রশ্ন", text: "খাতার ছবি তুলে জিজ্ঞেস করো (সাইন-ইন)।", href: "/tutor" },
];
export default function HomePage() {
  return (
    <div className="space-y-6">
      <Hero />
      <Marquee />
      <section>
        <h2 className="font-display text-2xl font-extrabold">কীভাবে কাজ করে? 🛠️</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} initial={{ scale: 0.7, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ ...bounce, delay: i * 0.08 }}>
              <Card>
                <CardBody>
                  <div className={`grid size-12 place-items-center rounded-full border-2 border-ink ${s.color}`}>
                    <s.icon size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
                  <p className="text-mutedfg">{s.text}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl font-extrabold">শেখার ধরন 🎨</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => (
            <Link key={m.title} href={m.href}>
              <Card className="h-full">
                <CardBody>
                  <div className={`grid size-12 place-items-center rounded-2xl border-2 border-ink ${m.color} ${m.color === "bg-tertiary" || m.color === "bg-quaternary" ? "text-ink" : "text-white"}`}>
                    <m.icon size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold">{m.title}</h3>
                  <p className="text-sm text-mutedfg">{m.text}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <SubjectCards />
      <section className="rounded-lg border-2 border-ink bg-card p-6 shadow-sticker">
        <h2 className="font-display text-2xl font-extrabold">নিরাপদে শেখো 🛡️</h2>
        <p className="mt-2 max-w-3xl">
          টিউটর অনুমোদিত বই থেকে শেখায়। তবু মাঝে মাঝে ভুল হতে পারে — গুরুত্বপূর্ণ কিছু হলে বাবা-মা বা শিক্ষকের সাথে যাচাই করে নিও।
          তোমার নাম-ঠিকানা কখনো লিখো না।
        </p>
      </section>
    </div>
  );
}
