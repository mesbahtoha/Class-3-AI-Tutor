"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TutorWorkspace } from "@/features/tutor/TutorWorkspace";

function TutorWithParams() {
  const params = useSearchParams();
  return <TutorWorkspace bookId={params.get("bookId") ?? undefined} />;
}

export default function TutorPage() {
  return (
    <Suspense>
      <TutorWithParams />
    </Suspense>
  );
}
