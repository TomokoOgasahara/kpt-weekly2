"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateCurrentWeek } from "@/lib/storage";

function AIRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekId = searchParams.get("id");

  useEffect(() => {
    if (weekId) {
      router.replace(`/week/${weekId}`);
    } else {
      const week = getOrCreateCurrentWeek();
      router.replace(`/week/${week.id}`);
    }
  }, [weekId, router]);

  return null;
}

export default function AIPage() {
  return (
    <Suspense>
      <AIRedirect />
    </Suspense>
  );
}
