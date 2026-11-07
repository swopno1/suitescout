// Manual send — human confirms the real address, then the approved
// email draft goes out through Resend. Caps still apply.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SendButton({
  draftId,
  to,
}: {
  draftId: number;
  to: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (!window.confirm(`Send this email to ${to} now?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={send}
        disabled={busy}
        className="btn-primary !px-3 !py-1.5 !text-xs"
      >
        {busy ? "Sending…" : "Send email"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
