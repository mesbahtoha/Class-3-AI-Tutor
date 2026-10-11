"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SkeletonList, EmptyState } from "@/components/ui/States";
import type { BookPublic } from "@/lib/api/contracts";

export default function BooksPage() {
  const [q, setQ] = useState("");
  const books = useQuery({
    queryKey: ["books"],
    queryFn: () => api.get<BookPublic[]>("/books").then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const items = (books.data ?? []).filter((b) =>
    q.trim() ? `${b.title} ${b.subjectName}`.toLowerCase().includes(q.trim().toLowerCase()) : true
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">বই 📚</h1>
      <div className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search size={18} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedfg" />
          <Input aria-label="বই খোঁজো" placeholder="বই বা বিষয় খোঁজো…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {q && <Button size="sm" variant="secondary" onClick={() => setQ("")}>মুছো</Button>}
      </div>
      {books.isLoading && <SkeletonList rows={4} />}
      {books.isError && <EmptyState title="বই আনা যায়নি" message="আবার চেষ্টা করো।" action={<Button size="sm" variant="secondary" onClick={() => books.refetch()}>আবার চেষ্টা</Button>} />}
      {books.data && items.length === 0 && (
        <EmptyState title={q ? "কিছু পাওয়া যায়নি" : "এখনো বই নেই"} message={q ? "অন্য নামে খুঁজে দেখো।" : "অ্যাডমিন বই প্রকাশ করলে এখানে দেখা যাবে।"} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b, i) => (
          <Link key={b.id} href={`/books/${b.id}`}>
            <Card featured={i === 0}>
              <CardBody>
                <div className={`mb-3 grid size-12 place-items-center rounded-full border-2 border-ink ${i % 3 === 0 ? "bg-accent text-white" : i % 3 === 1 ? "bg-secondary text-white" : "bg-tertiary text-ink"}`}>
                  <BookOpen size={24} strokeWidth={2.5} />
                </div>
                <h2 className="font-display text-lg font-bold">{b.title}</h2>
                <p className="text-sm text-mutedfg">{b.subjectName} · {b.grade}</p>
                <p className="text-sm text-mutedfg">{b.language}{b.editionLabel ? ` · ${b.editionLabel}` : ""}{b.editionYear ? ` (${b.editionYear})` : ""}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
