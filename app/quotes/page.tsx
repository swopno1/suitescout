import type { Metadata } from "next";
import Link from "next/link";
import { listQuotes } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quotes",
};

const MARKETS: Record<string, string> = {
  "intl-sub": "Intl subscription",
  "bd-onetime": "BD one-time",
  "bd-modelb": "BD Model B",
};

export default async function QuotesPage() {
  const quotes = await listQuotes();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Quotes</h1>
          <p className="page-sub">
            Totals come from price_items only — a hand adjustment is a
            discount, never a quote edit.
          </p>
        </div>
        <Link href="/quotes/new" className="btn-accent">
          New quote
        </Link>
      </div>

      {quotes.length === 0 ? (
        <p className="card text-sm text-stone-600">No quotes yet.</p>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th scope="col" className="px-4 py-2 font-bold">#</th>
                <th scope="col" className="px-4 py-2 font-bold">Customer</th>
                <th scope="col" className="px-4 py-2 font-bold">Market</th>
                <th scope="col" className="px-4 py-2 font-bold">One-time</th>
                <th scope="col" className="px-4 py-2 font-bold">Monthly</th>
                <th scope="col" className="px-4 py-2 font-bold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <Link href={`/quotes/${q.id}`} className="font-semibold text-brand-dark hover:underline">
                      #{q.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{q.customer_name}</td>
                  <td className="px-4 py-2 text-stone-600">{MARKETS[q.market] ?? q.market}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {q.total_onetime_minor === null ? "—" : formatMoney(q.total_onetime_minor, q.currency)}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {q.total_monthly_minor === null ? "—" : `${formatMoney(q.total_monthly_minor, q.currency)}/mo`}
                  </td>
                  <td className="px-4 py-2">
                    <span className="badge bg-stone-200 text-stone-700">{q.state}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
