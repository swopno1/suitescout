// S4 quote builder (client): selections + live preview from the
// same pure builder the server uses. The server re-totals on create.
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildQuoteLines } from "@/lib/quotes";
import { formatMoney } from "@/lib/format";
import type { PriceItem, Prospect, QuoteMarket } from "@/lib/types";

const MARKETS: { id: QuoteMarket; label: string }[] = [
  { id: "intl-sub", label: "Intl subscription (USD/mo)" },
  { id: "bd-onetime", label: "BD one-time (BDT)" },
  { id: "bd-modelb", label: "BD Model B (setup + 5%)" },
];

export function QuoteBuilder({
  items,
  prospects,
  modelbShare,
}: {
  items: PriceItem[];
  prospects: Prospect[];
  modelbShare: string;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [prospectId, setProspectId] = useState("");
  const [market, setMarket] = useState<QuoteMarket>("bd-onetime");
  const [picked, setPicked] = useState<string[]>(["base"]);
  const [hostingKey, setHostingKey] = useState("");
  const [domainLabel, setDomainLabel] = useState("");
  const [domainAmount, setDomainAmount] = useState("");
  const [chatbotTier, setChatbotTier] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = market === "intl-sub" ? "USD" : "BDT";
  const pickable = items.filter(
    (i) => i.active && i.group !== "hosting" && i.group !== "chatbot",
  );
  const hostings = items.filter((i) => i.active && i.group === "hosting");

  const preview = useMemo(() => {
    try {
      const amt = domainAmount.trim() === "" ? null : Number(domainAmount);
      return {
        built: buildQuoteLines(
          {
            market,
            items: picked,
            hostingKey: hostingKey || null,
            domainLabel: domainLabel.trim() || null,
            domainAmountMinor:
              amt === null || !Number.isFinite(amt) ? null : Math.round(amt * 100),
            domainCurrency: currency,
            chatbotTier: chatbotTier || null,
          },
          items,
          modelbShare,
        ),
        error: null as string | null,
      };
    } catch (e) {
      return {
        built: null,
        error: e instanceof Error ? e.message : "Cannot total this selection.",
      };
    }
  }, [market, picked, hostingKey, domainLabel, domainAmount, currency, chatbotTier, items, modelbShare]);

  function toggle(key: string) {
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  async function create() {
    setError(null);
    if (!customerName.trim() && !prospectId) {
      setError("Name the customer or pick a prospect.");
      return;
    }
    setBusy(true);
    try {
      const amt = domainAmount.trim() === "" ? null : Math.round(Number(domainAmount) * 100);
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName:
            customerName.trim() ||
            prospects.find((p) => String(p.id) === prospectId)?.name ||
            "",
          prospectId: prospectId ? Number(prospectId) : null,
          market,
          items: picked,
          hostingKey: hostingKey || null,
          domainLabel: domainLabel.trim() || null,
          domainAmountMinor: amt,
          domainCurrency: currency,
          chatbotTier: chatbotTier || null,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; quote?: { id: number } };
      if (!res.ok || !data.quote) throw new Error(data.error || "Create failed.");
      router.push(`/quotes/${data.quote.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label mb-1 block" htmlFor="q-customer">Customer</label>
            <input id="q-customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Resort name" className="input w-full" />
          </div>
          <div>
            <label className="label mb-1 block" htmlFor="q-prospect">…or sales prospect</label>
            <select id="q-prospect" value={prospectId} onChange={(e) => setProspectId(e.target.value)} className="input w-full">
              <option value="">Free entry</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label mb-1">Market</legend>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <label key={m.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${market === m.id ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`}>
                <input type="radio" name="market" value={m.id} checked={market === m.id} onChange={() => setMarket(m.id)} className="sr-only" />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-1">Items (base required by policy — tick it)</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {pickable.map((i) => (
              <label key={i.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={picked.includes(i.key)} onChange={() => toggle(i.key)} className="h-4 w-4" />
                <span className="font-medium">{i.name}</span>
                <span className="text-xs text-stone-500">
                  {currency === "USD" ? formatMoney(i.intl_monthly_cents, "USD") : formatMoney(i.bd_onetime_poisha, "BDT")}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label mb-1 block" htmlFor="q-hosting">Hosting</label>
            <select id="q-hosting" value={hostingKey} onChange={(e) => setHostingKey(e.target.value)} className="input w-full">
              <option value="">None</option>
              {hostings.map((h) => (
                <option key={h.key} value={h.key}>{h.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-1 block" htmlFor="q-chatbot">Chatbot tier</label>
            <select id="q-chatbot" value={chatbotTier} onChange={(e) => setChatbotTier(e.target.value)} className="input w-full">
              <option value="">None</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="SCALE">Scale</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label mb-1 block" htmlFor="q-domain">Domain (pass-through, at cost)</label>
            <input id="q-domain" value={domainLabel} onChange={(e) => setDomainLabel(e.target.value)} placeholder="e.g. resort.com renewal" className="input w-full" />
          </div>
          <div>
            <label className="label mb-1 block" htmlFor="q-domain-amt">Domain amount ({currency})</label>
            <input id="q-domain-amt" value={domainAmount} onChange={(e) => setDomainAmount(e.target.value)} inputMode="decimal" placeholder="0" className="input w-full tabular-nums" />
          </div>
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="q-notes">Notes</label>
          <input id="q-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="input w-full" />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 text-lg font-bold">Preview</h2>
        {preview.error && (
          <p role="alert" className="text-sm font-semibold text-red-700">{preview.error}</p>
        )}
        {preview.built && (
          <>
            <ul className="divide-y divide-stone-100 text-sm">
              {preview.built.lines.map((l) => (
                <li key={l.key} className="flex items-baseline justify-between gap-4 py-1.5">
                  <span>
                    <span className="font-medium">{l.name}</span>{" "}
                    <span className="text-xs text-stone-500">
                      {l.kind === "note" ? "" : l.kind === "monthly" ? "/mo" : "one-time"}
                    </span>
                    {l.note && <span className="block text-xs text-stone-500">{l.note}</span>}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {l.unit_minor === null ? "—" : formatMoney(l.unit_minor, currency)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-stone-200 pt-2 text-sm">
              {preview.built.totalOnetimeMinor !== null && (
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold">One-time total</dt>
                  <dd className="font-extrabold tabular-nums">{formatMoney(preview.built.totalOnetimeMinor, currency)}</dd>
                </div>
              )}
              {preview.built.totalMonthlyMinor !== null && (
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold">Monthly total</dt>
                  <dd className="font-extrabold tabular-nums">{formatMoney(preview.built.totalMonthlyMinor, currency)}/mo</dd>
                </div>
              )}
            </dl>
          </>
        )}
        <button onClick={create} disabled={busy || !preview.built} className="btn-accent mt-3 w-full">
          {busy ? "Creating…" : "Create draft quote"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>
        )}
      </div>
    </div>
  );
}
