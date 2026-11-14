// S4 quote transitions (client): send / accept / decline / expire.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteState } from "@/lib/types";

const NEXT: Record<QuoteState, { to: QuoteState; label: string }[]> = {
  draft: [
    { to: "sent", label: "Send quote" },
    { to: "declined", label: "Decline" },
  ],
  sent: [
    { to: "accepted", label: "Mark accepted" },
    { to: "declined", label: "Mark declined" },
    { to: "expired", label: "Mark expired" },
  ],
  accepted: [],
  declined: [],
  expired: [],
};

export function QuoteTransitions({
  quoteId,
  state,
}: {
  quoteId: number;
  state: QuoteState;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = NEXT[state];
  if (next.length === 0) return null;

  async function go(to: QuoteState) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Transition failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next.map((n) => (
        <button key={n.to} onClick={() => go(n.to)} disabled={busy} className="btn-accent">
          {busy ? "…" : n.label}
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
