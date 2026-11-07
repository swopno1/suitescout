// Record an approved draft as sent (the human sends outside the app).
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarkSentButton({ draftId }: { draftId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markSent() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/sent`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark sent");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={markSent}
        disabled={busy}
        className="btn-primary !px-3 !py-1.5 !text-xs"
      >
        {busy ? "Recording…" : "Mark sent"}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
