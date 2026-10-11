"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { SkeletonList, EmptyState } from "@/components/ui/States";
import type { ChildProfile } from "@/lib/api/contracts";

const schema = z.object({
  nickname: z.string().min(1, "ডাকনাম লেখো").max(60),
  grade: z.string().default("Class 3"),
  preferredLanguage: z.enum(["bn", "en", "banglish", "auto"]).default("auto"),
});

type Form = z.infer<typeof schema>;

export default function ParentPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<ChildProfile | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { grade: "Class 3", preferredLanguage: "auto" },
  });

  const list = useQuery({
    queryKey: ["child-profiles"],
    enabled: !!user,
    queryFn: () => api.get<ChildProfile[]>("/me/child-profiles", { token }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (v: Form) => api.post("/me/child-profiles", { token, body: v }),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["child-profiles"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/me/child-profiles/${id}`, { token }),
    onSuccess: () => {
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["child-profiles"] });
    },
  });

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="text-center">
          <h1 className="font-display text-xl font-extrabold">অভিভাবক পাতা 👨‍👩‍👧</h1>
          <p className="text-mutedfg">প্রোফাইল দেখতে সাইন ইন করো।</p>
          <a href="/welcome" className="mt-3 inline-block"><Button size="sm">সাইন ইন</Button></a>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold">অভিভাবক 👨‍👩‍👧</h1>
      <Card>
        <CardBody>
          <h2 className="font-display text-lg font-bold">নতুন শিশু প্রোফাইল ➕</h2>
          <p className="text-sm text-mutedfg">শুধু ডাকনামই যথেষ্ট — পুরো নাম, জন্মতারিখ, স্কুল লাগবে না।</p>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="nick">ডাকনাম</Label>
              <Input id="nick" placeholder="যেমন: মিমি" {...register("nickname")} />
              {errors.nickname && <p role="alert" className="text-sm font-bold text-secondary">{errors.nickname.message}</p>}
            </div>
            <div>
              <Label htmlFor="grade">শ্রেণি</Label>
              <Input id="grade" {...register("grade")} />
            </div>
            <div>
              <Label htmlFor="clang">ভাষা</Label>
              <Select id="clang" {...register("preferredLanguage")}>
                <option value="auto">অটো</option>
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
                <option value="banglish">Banglish</option>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? "…" : "প্রোফাইল বানাও"}</Button>
              {create.isError && <p role="alert" className="mt-1 text-sm font-bold text-secondary">বানানো যায়নি।</p>}
            </div>
          </form>
        </CardBody>
      </Card>
      <div>
        <h2 className="font-display text-lg font-bold">প্রোফাইলগুলো 👧🧒</h2>
        {list.isLoading && <SkeletonList rows={2} />}
        {list.data && list.data.length === 0 && <EmptyState title="কোনো প্রোফাইল নেই" message="উপরে ফর্ম থেকে প্রথম প্রোফাইল বানাও।" />}
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(list.data ?? []).map((p) => (
            <Card key={p.id}>
              <CardBody>
                <p className="font-display text-lg font-extrabold">🌟 {p.nickname}</p>
                <p className="text-sm text-mutedfg">{p.grade} · {p.preferredLanguage}</p>
                <Button size="sm" variant="danger" className="mt-2" onClick={() => setDeleting(p)}>মুছো</Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        busy={remove.isPending}
        title="প্রোফাইল মুছবে?"
        message={`“${deleting?.nickname}”-এর প্রোফাইল ও সংশ্লিষ্ট তথ্য মুছে যাবে।`}
        confirmLabel="হ্যাঁ, মুছো"
      />
    </div>
  );
}
