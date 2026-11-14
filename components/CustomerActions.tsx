// S3 admin actions (client): suspend/reactivate + manual approval.
// Reason is always required; the server records the audit row.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MANUAL_PLANS } from "@/lib/admin-action-validation";

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Action failed.");
}

export function HoldForm({
  propertyId,
  onHold,
}: {
  propertyId: string;
  onHold: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError("Give a reason — it goes in the audit row.");
      return;
    }
    setBusy(true);
    try {
      await post(
        `/api/customers/${propertyId}/${onHold ? "reactivate" : "suspend"}`,
        { reason: reason.trim() },
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="label block" htmlFor="hold-reason">
        Reason (required, audited)
      </label>
      <input
        id="hold-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={onHold ? "e.g. Invoice paid, service restored" : "e.g. Non-payment after two reminders"}
        className="input w-full"
      />
      <button
        type="submit"
        disabled={busy}
        className={onHold ? "btn-accent" : "btn-accent bg-red-700 hover:bg-red-800"}
      >
        {busy ? "Working…" : onHold ? "Reactivate property" : "Suspend property"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

export function ManualApprovalForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<string>("GROWTH");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await post(`/api/customers/${propertyId}/manual-approval`, {
        plan,
        periodEnd,
        reference: reference.trim(),
        reason: reason.trim(),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
      <div>
        <label className="label mb-1 block" htmlFor="manual-plan">
          Plan
        </label>
        <select
          id="manual-plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="input w-full"
        >
          {MANUAL_PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label mb-1 block" htmlFor="manual-end">
          Paid through (date)
        </label>
        <input
          id="manual-end"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="input w-full"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label mb-1 block" htmlFor="manual-ref">
          Payment reference (required — invoice id once S5 exists)
        </label>
        <input
          id="manual-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. bKash TrxID 9J2831KL90, 2026-11-14"
          className="input w-full"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label mb-1 block" htmlFor="manual-reason">
          Reason (required, audited)
        </label>
        <input
          id="manual-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Annual BD deal, bank transfer received"
          className="input w-full"
        />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-accent">
          {busy ? "Working…" : "Approve manual subscription"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
