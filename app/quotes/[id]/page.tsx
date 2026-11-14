import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getQuote,
  listAdminActionsFor,
  listDiscountsForTarget,
} from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { isQuoteExpired } from "@/lib/quotes";
import { QuoteTransitions } from "@/components/QuoteTransitions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quote",
};

const MARKETS: Record<string, string> = {
  "intl-sub": "Intl subscription",
  "bd-onetime": "BD one-time",
  "bd-modelb": "BD Model B",
};

function discountFigure(
  kind: string,
  valueMinor: number,
  currency: "USD" | "BDT" | null,
): string {
  if (kind === "percent") return `${valueMinor}% off`;
  return `${formatMoney(valueMinor, currency ?? "BDT")} off`;
}

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const quote = await getQuote(id);
  if (!quote) notFound();
  const [itemDiscounts, hostingDiscounts, history] = await Promise.all([
    listDiscountsForTarget("quote", String(id)),
    listDiscountsForTarget("hosting", String(id)),
    listAdminActionsFor("quote", String(id)).catch(() => []),
  ]);
  const discounts = [...itemDiscounts, ...hostingDiscounts];
  const expired = isQuoteExpired(quote.state, quote.valid_until, new Date());

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <Link href="/quotes" className="font-semibold text-brand hover:underline">
          ← All quotes
        </Link>
      </p>
      <div>
        <h1 className="page-title">
          Quote #{quote.id} — {quote.customer_name}
        </h1>
        <p className="page-sub">
          <span className="badge bg-stone-200 text-stone-700">
            {expired ? "expired" : quote.state}
          </span>{" "}
          <span className="text-stone-500">
            {MARKETS[quote.market]} · {quote.currency}
            {quote.valid_until ? ` · valid to ${quote.valid_until.slice(0, 10)}` : ""}
          </span>
        </p>
      </div>

      <section className="card" aria-label="Quote lines">
        <ul className="divide-y divide-stone-100 text-sm">
          {quote.lines.map((l) => (
            <li key={l.key} className="flex items-baseline justify-between gap-4 py-1.5">
              <span>
                <span className="font-medium">{l.name}</span>{" "}
                <span className="text-xs text-stone-500">
                  {l.kind === "note" ? "" : l.kind === "monthly" ? "/mo" : "one-time"}
                </span>
                {l.note && <span className="block text-xs text-stone-500">{l.note}</span>}
              </span>
              <span className="font-semibold tabular-nums">
                {l.unit_minor === null ? "—" : formatMoney(l.unit_minor, quote.currency)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-stone-200 pt-2 text-sm">
          {quote.total_onetime_minor !== null && (
            <div className="flex justify-between gap-4">
              <dt className="font-semibold">One-time total</dt>
              <dd className="font-extrabold tabular-nums">
                {formatMoney(quote.total_onetime_minor, quote.currency)}
              </dd>
            </div>
          )}
          {quote.total_monthly_minor !== null && (
            <div className="flex justify-between gap-4">
              <dt className="font-semibold">Monthly total</dt>
              <dd className="font-extrabold tabular-nums">
                {formatMoney(quote.total_monthly_minor, quote.currency)}/mo
              </dd>
            </div>
          )}
        </dl>
        {quote.notes && (
          <p className="mt-2 text-sm text-stone-600">Notes: {quote.notes}</p>
        )}
      </section>

      <section className="card" aria-label="Quote state">
        <h2 className="mb-2 text-lg font-bold">State</h2>
        <QuoteTransitions quoteId={quote.id} state={quote.state} />
        {quote.state === "accepted" && quote.market !== "intl-sub" && (
          <p className="mt-2 text-sm text-stone-600">
            Accepted BD quotes hand off to S5 invoicing (not landed yet —
            the invoice reads this quote plus its applied discounts).
          </p>
        )}
        {quote.state === "accepted" && quote.market === "intl-sub" && (
          <p className="mt-2 text-sm text-stone-600">
            Accepted: the subscription itself is provisioned in
            Concierge/Stripe — this record is the commercial outcome.
          </p>
        )}
      </section>

      <section className="card" aria-label="Discounts on this quote">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Discounts</h2>
          <Link href={`/discounts/new?target=quote:${quote.id}`} className="text-sm font-semibold text-brand hover:underline">
            Request discount →
          </Link>
        </div>
        {discounts.length === 0 ? (
          <p className="text-sm text-stone-600">
            No discounts. Until S5 lands, applied discounts show here with
            their resulting figures.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {discounts.map((d) => (
              <li key={d.id} className="py-2">
                <p>
                  <Link href={`/discounts/${d.id}`} className="font-semibold text-brand-dark hover:underline">
                    #{d.id} {d.product}
                  </Link>{" "}
                  <span className="badge bg-stone-200 text-stone-700">{d.state}</span>{" "}
                  {d.below_floor && (
                    <span className="badge bg-red-700/10 text-red-700">below floor</span>
                  )}
                </p>
                <p className="text-stone-600">
                  {discountFigure(d.kind, d.value_minor, d.currency)} · {d.duration_kind}
                  {d.duration_kind === "months" ? ` (${d.duration_months}mo)` : ""} ·{" "}
                  {d.reason}
                </p>
                {d.stripe_coupon_id && (
                  <p className="text-xs text-stone-500">Stripe coupon {d.stripe_coupon_id}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-label="Quote history">
        <h2 className="mb-2 text-lg font-bold">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-stone-600">No audit rows yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {history.map((a) => (
              <li key={a.id} className="py-1.5">
                <span className="font-semibold">{a.action}</span>{" "}
                <span className="text-stone-500">
                  by {a.actor} · {a.at.slice(0, 16).replace("T", " ")}
                </span>
                <span className="block text-stone-600">{a.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
