"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveButton({ draftId }: { draftId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve draft");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve draft");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={approve}
        disabled={busy}
        className="rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Approving…" : "Approve draft"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
