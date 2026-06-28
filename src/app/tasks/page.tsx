"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateCurrentWeek } from "@/lib/storage";

export default function TasksRedirect() {
  const router = useRouter();

  useEffect(() => {
    const week = getOrCreateCurrentWeek();
    router.replace(`/week/${week.id}`);
  }, [router]);

  return null;
}
