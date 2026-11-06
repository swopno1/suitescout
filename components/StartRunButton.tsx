"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartRunButton({
  prospectId,
  prospectName,
}: {
  prospectId: number;
  prospectName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: prospectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start run");
      router.push(`/run?id=${data.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={start}
        disabled={busy}
        className="btn-accent shrink-0"
      >
        {busy ? "Queuing…" : `Run agent on ${prospectName}`}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
