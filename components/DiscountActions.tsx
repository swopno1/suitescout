// S4 discount lifecycle actions (client): approve (one-tap or manual
// below-floor), deny, apply, expire.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Discount } from "@/lib/types";

async function act(id: number, body: Record<string, unknown>) {
  const res = await fetch(`/api/discounts/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Action failed.");
}

export function DiscountActions({ discount }: { discount: Discount }) {
  const router = useRouter();
  const [manualReason, setManualReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      await act(discount.id, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {discount.state === "requested" && (
        <div className="space-y-2">
          {discount.below_floor ? (
            <>
              <p className="text-sm font-semibold text-red-700">
                Below the floor — explicit manual approval with a written reason.
              </p>
              <label className="label block" htmlFor="manual-reason">Manual approval reason</label>
              <input
                id="manual-reason"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="Why below the floor (min 3 characters)"
                className="input w-full"
              />
              <button onClick={() => run({ action: "approve", manualReason })} disabled={busy} className="btn-accent">
                {busy ? "…" : "Approve below floor"}
              </button>
            </>
          ) : (
            <button onClick={() => run({ action: "approve" })} disabled={busy} className="btn-accent">
              {busy ? "…" : "Approve (one tap)"}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Denial note (optional)"
              aria-label="Denial note"
              className="input flex-1"
            />
            <button onClick={() => run({ action: "deny", note })} disabled={busy} className="btn-ghost">
              Deny
            </button>
          </div>
        </div>
      )}
      {discount.state === "approved" && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">
            {discount.target_type === "subscription"
              ? "Rail A: approval creates a Stripe coupon on the live subscription."
              : "Rail B: approval puts the discount live on the quote (S5 invoices from this record)."}
          </p>
          <button onClick={() => run({ action: "apply" })} disabled={busy} className="btn-accent">
            {busy ? "Applying…" : "Apply now"}
          </button>
        </div>
      )}
      {(discount.state === "applied" || discount.state === "approved") && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Expiry note (optional)"
            aria-label="Expiry note"
            className="input flex-1"
          />
          <button onClick={() => run({ action: "expire", note })} disabled={busy} className="btn-ghost">
            Mark expired
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
