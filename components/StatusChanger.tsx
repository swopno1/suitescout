"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types";

export default function StatusChanger({
  prospectId,
  currentStatus,
}: {
  prospectId: number;
  currentStatus: ProspectStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(status: ProspectStatus) {
    if (status === currentStatus) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Move to:</span>
      {PROSPECT_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => change(s)}
          disabled={busy || s === currentStatus}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            s === currentStatus
              ? "border-brand bg-brand text-white"
              : "border-stone-300 bg-white hover:border-brand"
          } disabled:opacity-50`}
        >
          {PROSPECT_STATUS_LABELS[s]}
        </button>
      ))}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
