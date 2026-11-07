"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BatchRunButton({ newCount }: { newCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/runs/batch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start batch run");
      setResult(
        `Started ${data.created} run${data.created === 1 ? "" : "s"}` +
          (data.skipped > 0 ? ` · ${data.skipped} skipped (already running)` : "") +
          (data.capped
            ? ` · first 25 of ${data.total_new} (press again for the rest)`
            : ""),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start batch run");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        onClick={start}
        disabled={busy || newCount === 0}
        className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy
          ? "Starting runs…"
          : newCount === 0
            ? "No New prospects to run"
            : `Run agent on ${newCount} New prospect${newCount === 1 ? "" : "s"}`}
      </button>
      {result && <span className="text-sm font-medium text-brand-dark">{result}</span>}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
