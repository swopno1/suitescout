// Auto-refreshes the server-rendered run view while a run is active,
// so the five-step trace updates live without a manual reload.
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RunAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [active, router]);
  return null;
}
