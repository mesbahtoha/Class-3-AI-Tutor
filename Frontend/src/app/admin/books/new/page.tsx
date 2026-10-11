"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const schema = z.object({
  title: z.string().min(1, "শিরোনাম লেখো").max(300),
  grade: z.string().default("Class 3"),
  curriculumName: z.string().default("NCTB"),
  subjectName: z.string().default(""),
  language: z.string().default("bn"),
  editionYear: z.string().optional(),
  editionLabel: z.string().optional(),
  publisher: z.string().optional(),
  rightsStatus: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function NewBookPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { grade: "Class 3", curriculumName: "NCTB", language: "bn" },
  });

  const create = useMutation({
    mutationFn: (values: Form) => {
      if (!file) throw new Error("file");
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v) fd.append(k, String(v));
      });
      fd.append("file", file);
      return api.post<{ book: { id: string }; jobId: string }>("/admin/books", { token, form: fd }).then((r) => r.data);
    },
    onSuccess: (data) => router.push(`/admin/books/${data.book.id}`),
  });

  function pick(f: File | undefined) {
    setFileError("");
    if (!f) return;
    const ok = f.type === "application/pdf" || f.type === "text/plain" || /\.pdf$/i.test(f.name) || /\.txt$/i.test(f.name);
    if (!ok) {
      setFileError("শুধু PDF (বা TXT) বই নেওয়া হয়।");
      return;
    }
    setFile(f);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold">নতুন বই ➕</h1>
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid gap-3 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <Label htmlFor="title">বইয়ের শিরোনাম *</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p role="alert" className="text-sm font-bold text-secondary">{errors.title.message}</p>}
            </div>
            <div><Label htmlFor="grade">শ্রেণি</Label><Input id="grade" {...register("grade")} /></div>
            <div><Label htmlFor="curr">কারিকুলাম</Label><Input id="curr" {...register("curriculumName")} /></div>
            <div><Label htmlFor="subj">বিষয়</Label><Input id="subj" placeholder="যেমন: গণিত" {...register("subjectName")} /></div>
            <div><Label htmlFor="lang">ভাষা</Label><Input id="lang" {...register("language")} /></div>
            <div><Label htmlFor="ed">সংস্করণ</Label><Input id="ed" {...register("editionLabel")} /></div>
            <div><Label htmlFor="edy">সংস্করণ বছর</Label><Input id="edy" {...register("editionYear")} /></div>
            <div><Label htmlFor="pub">প্রকাশক/উৎস</Label><Input id="pub" {...register("publisher")} /></div>
            <div className="sm:col-span-2"><Label htmlFor="rights">স্বত্ব/অনুমতি নোট</Label><Input id="rights" {...register("rightsStatus")} /></div>
            <div className="sm:col-span-2">
              <Label htmlFor="pdffile">PDF ফাইল *</Label>
              <Input id="pdffile" type="file" accept="application/pdf,text/plain,.pdf,.txt" onChange={(e) => pick(e.target.files?.[0])} />
              {fileError && <p role="alert" className="text-sm font-bold text-secondary">{fileError}</p>}
              {file && <p className="text-sm">📄 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
            </div>
            {create.isError && <p role="alert" className="font-bold text-secondary sm:col-span-2">আপলোড হয়নি। তথ্য ও ফাইল দেখে আবার চেষ্টা করো।</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!file || create.isPending}>
                {create.isPending ? "আপলোড হচ্ছে…" : "আপলোড করে প্রসেস শুরু করো"}
              </Button>
              <p className="mt-2 text-xs text-mutedfg">আপলোড ≠ প্রকাশ। প্রসেসিং ও পর্যালোচনার পর আলাদাভাবে প্রকাশ করতে হবে।</p>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
