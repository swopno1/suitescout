// S4 discount request form (client): list/floor/result preview from
// the same pure evaluator the server uses.
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { evaluateDiscountRequest } from "@/lib/discounts";
import { formatMoney } from "@/lib/format";
import type { Discount, PriceItem, Quote } from "@/lib/types";

export function DiscountRequestForm({
  quotes,
  items,
  prefill,
}: {
  quotes: Quote[];
  items: PriceItem[];
  prefill: { targetType: Discount["target_type"]; targetId: string } | null;
}) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<Discount["target_type"]>(
    prefill?.targetType ?? "quote",
  );
  const [targetId, setTargetId] = useState(prefill?.targetId ?? "");
  const [customerLabel, setCustomerLabel] = useState("");
  const [product, setProduct] = useState("");
  const [kind, setKind] = useState<Discount["kind"]>("percent");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState<"USD" | "BDT">("BDT");
  const [durationKind, setDurationKind] =
    useState<Discount["duration_kind"]>("once");
  const [durationMonths, setDurationMonths] = useState("3");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote =
    targetType === "quote" || targetType === "hosting"
      ? (quotes.find((q) => String(q.id) === targetId) ?? null)
      : null;
  const products: { key: string; label: string }[] =
    targetType === "subscription"
      ? [{ key: "concierge-subscription", label: "Concierge subscription (Rail A — Stripe coupon)" }]
      : targetType === "hosting"
        ? (quote?.hosting_key
            ? [{ key: quote.hosting_key, label: `${quote.hosting_key} (this quote's hosting)` }]
            : [])
        : (quote?.lines ?? [])
            .filter((l) => l.unit_minor !== null && l.key !== "domain")
            .map((l) => ({ key: l.key, label: l.name }));

  const preview = useMemo(() => {
    try {
      const line =
        quote?.lines.find((l) => l.key === product && l.unit_minor !== null) ??
        null;
      const floor =
        items.find((i) => i.key === product)?.bd_floor_poisha ?? null;
      const valid = evaluateDiscountRequest(
        {
          targetType,
          targetId,
          customerLabel: customerLabel || "—",
          product: product || "—",
          kind,
          value: Number(value),
          currency: kind === "fixed" ? currency : null,
          durationKind,
          durationMonths: durationKind === "months" ? Number(durationMonths) : null,
          reason: reason || "—",
        },
        line?.unit_minor ?? null,
        floor,
      );
      return { valid, quoteCurrency: quote?.currency ?? null, error: null as string | null };
    } catch (e) {
      return {
        valid: null,
        quoteCurrency: null,
        error: e instanceof Error ? e.message : "Incomplete.",
      };
    }
  }, [quote, product, kind, value, currency, durationKind, durationMonths, targetType, targetId, customerLabel, reason, items]);

  async function submit() {
    setError(null);
    if (!targetId.trim() || !customerLabel.trim() || !product || !reason.trim()) {
      setError("Target, customer, product and reason are all required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: targetId.trim(),
          customerLabel: customerLabel.trim(),
          product,
          kind,
          value: Number(value),
          currency: kind === "fixed" ? currency : null,
          durationKind,
          durationMonths: durationKind === "months" ? Number(durationMonths) : null,
          reason: reason.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; discount?: { id: number } };
      if (!res.ok || !data.discount) throw new Error(data.error || "Request failed.");
      router.push(`/discounts/${data.discount.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const cur: "USD" | "BDT" =
    kind === "fixed" ? currency : (preview.quoteCurrency ?? "BDT");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="label mb-1 block" htmlFor="d-target">Rail / target</label>
            <select id="d-target" value={targetType} onChange={(e) => { setTargetType(e.target.value as Discount["target_type"]); setProduct(""); }} className="input w-full">
              <option value="quote">Quote line (Rail B)</option>
              <option value="hosting">Quote hosting (Rail B)</option>
              <option value="subscription">Subscription (Rail A)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label mb-1 block" htmlFor="d-target-id">
              {targetType === "subscription" ? "Concierge property id" : "Quote"}
            </label>
            {targetType === "subscription" ? (
              <input id="d-target-id" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="property id from Customers" className="input w-full font-mono" />
            ) : (
              <select id="d-target-id" value={targetId} onChange={(e) => { setTargetId(e.target.value); setProduct(""); }} className="input w-full">
                <option value="">Pick a quote</option>
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>#{q.id} — {q.customer_name} ({q.state})</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label mb-1 block" htmlFor="d-customer">Customer</label>
            <input id="d-customer" value={customerLabel} onChange={(e) => setCustomerLabel(e.target.value)} placeholder="Label for the record" className="input w-full" />
          </div>
          <div>
            <label className="label mb-1 block" htmlFor="d-product">Product</label>
            <select id="d-product" value={product} onChange={(e) => setProduct(e.target.value)} className="input w-full">
              <option value="">Pick a product</option>
              {products.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="label mb-1 block" htmlFor="d-kind">Kind</label>
            <select id="d-kind" value={kind} onChange={(e) => setKind(e.target.value as Discount["kind"])} className="input w-full">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="label mb-1 block" htmlFor="d-value">
              {kind === "percent" ? "Percent (1–100)" : `Amount (${currency})`}
            </label>
            <input id="d-value" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="input w-full tabular-nums" />
          </div>
          <div>
            <label className="label mb-1 block" htmlFor="d-currency">Currency</label>
            <select id="d-currency" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "BDT")} className="input w-full" disabled={kind === "percent"}>
              <option value="BDT">BDT</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label mb-1 block" htmlFor="d-duration">Duration</label>
            <select id="d-duration" value={durationKind} onChange={(e) => setDurationKind(e.target.value as Discount["duration_kind"])} className="input w-full">
              <option value="once">Once</option>
              <option value="months">N months</option>
              <option value="ongoing">Ongoing</option>
            </select>
          </div>
          {durationKind === "months" && (
            <div>
              <label className="label mb-1 block" htmlFor="d-months">Months (1–36)</label>
              <input id="d-months" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} inputMode="numeric" className="input w-full tabular-nums" />
            </div>
          )}
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="d-reason">Reason (required)</label>
          <input id="d-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this discount" className="input w-full" />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 text-lg font-bold">Preview</h2>
        {preview.error && <p className="text-sm text-stone-500">{preview.error}</p>}
        {preview.valid && (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">List</dt>
              <dd className="font-semibold tabular-nums">{preview.valid.listMinor === null ? "unpriced" : formatMoney(preview.valid.listMinor, cur)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Floor</dt>
              <dd className="font-semibold tabular-nums">{preview.valid.floorMinor === null ? "none" : formatMoney(preview.valid.floorMinor, cur)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Result</dt>
              <dd className="font-extrabold tabular-nums">{preview.valid.resultMinor === null ? "—" : formatMoney(preview.valid.resultMinor, cur)}</dd>
            </div>
            <p className={`mt-2 text-sm font-semibold ${preview.valid.belowFloor ? "text-red-700" : "text-green-700"}`}>
              {preview.valid.belowFloor
                ? "Below the floor (or unverifiable) — explicit manual approval with a written reason."
                : "At or above the floor — one-tap approval."}
            </p>
          </dl>
        )}
        <button onClick={submit} disabled={busy || !preview.valid} className="btn-accent mt-3 w-full">
          {busy ? "Requesting…" : "Request discount"}
        </button>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </div>
  );
}
