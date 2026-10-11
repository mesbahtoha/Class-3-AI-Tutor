"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SkeletonList, EmptyState } from "@/components/ui/States";

interface AdminBook {
  id: string;
  title: string;
  processingStatus: string;
  publicationStatus: string;
}

/** Admin overview: real endpoint data only — no fake zeros. */
export default function AdminDashboard() {
  const { token } = useAuth();
  const books = useQuery({
    queryKey: ["admin", "books", "overview"],
    queryFn: () => api.get<{ data?: AdminBook[] } | AdminBook[]>("/admin/books?pageSize=100", { token }).then((r) =>
      Array.isArray(r.data) ? r.data : (r.data.data ?? [])
    ),
  });
  const jobs = useQuery({
    queryKey: ["admin", "jobs", "overview"],
    queryFn: () => api.get<Array<{ id: string; status: string }>>("/admin/ingestion-jobs", { token }).then((r) => r.data),
  });

  const list = books.data ?? [];
  const published = list.filter((b) => b.publicationStatus === "PUBLISHED").length;
  const awaiting = list.filter((b) => !["PUBLISHED", "ARCHIVED"].includes(b.publicationStatus)).length;
  const byStatus = (jobs.data ?? []).reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});
  const failed = (jobs.data ?? []).filter((j) => j.status === "FAILED").slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">অ্যাডমিন ড্যাশবোর্ড 🛠️</h1>
      {books.isLoading ? (
        <SkeletonList rows={3} />
      ) : books.isError ? (
        <EmptyState title="লোড হয়নি" message="অনুমতি বা সংযোগ দেখে আবার চেষ্টা করো।" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardBody><p className="font-display text-3xl font-extrabold">{list.length}</p><p className="text-mutedfg">মোট বই</p></CardBody></Card>
            <Card><CardBody><p className="font-display text-3xl font-extrabold">{published}</p><p className="text-mutedfg">প্রকাশিত</p></CardBody></Card>
            <Card><CardBody><p className="font-display text-3xl font-extrabold">{awaiting}</p><p className="text-mutedfg">পর্যালোচনার অপেক্ষায়</p></CardBody></Card>
          </div>
          <Card>
            <CardBody>
              <h2 className="font-display font-bold">প্রসেসিং কাজ</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(byStatus).map(([s, n]) => (
                  <Badge key={s} tone={statusTone(s)}>{s}: {n}</Badge>
                ))}
                {Object.keys(byStatus).length === 0 && <span className="text-sm text-mutedfg">তথ্য নেই</span>}
              </div>
            </CardBody>
          </Card>
          {failed.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="font-display font-bold">⚠️ ব্যর্থ কাজ (মনোযোগ দাও)</h2>
                <ul className="mt-2 space-y-1">
                  {failed.map((j) => (
                    <li key={j.id}>
                      <Link href="/admin/ingestion-jobs" className="font-bold text-accent underline">{j.id}</Link>
                      {" "}<Badge tone="pink">FAILED</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
