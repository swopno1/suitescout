import type { Metadata } from "next";
import Link from "next/link";
import { listDiscounts } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discounts",
};

export default async function DiscountsPage() {
  const discounts = await listDiscounts();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Discounts</h1>
          <p className="page-sub">
            One active discount per customer per product. Rail A (Stripe
            coupon) for subscriptions, Rail B (quote/invoice line) for BD.
          </p>
        </div>
        <Link href="/discounts/new" className="btn-accent">
          Request discount
        </Link>
      </div>

      {discounts.length === 0 ? (
        <p className="card text-sm text-stone-600">No discounts yet.</p>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th scope="col" className="px-4 py-2 font-bold">#</th>
                <th scope="col" className="px-4 py-2 font-bold">Customer</th>
                <th scope="col" className="px-4 py-2 font-bold">Product</th>
                <th scope="col" className="px-4 py-2 font-bold">Value</th>
                <th scope="col" className="px-4 py-2 font-bold">Duration</th>
                <th scope="col" className="px-4 py-2 font-bold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <Link href={`/discounts/${d.id}`} className="font-semibold text-brand-dark hover:underline">
                      #{d.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{d.customer_label}</td>
                  <td className="px-4 py-2">{d.product}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {d.kind === "percent"
                      ? `${d.value_minor}%`
                      : formatMoney(d.value_minor, d.currency ?? "BDT")}
                  </td>
                  <td className="px-4 py-2 text-stone-600">
                    {d.duration_kind}
                    {d.duration_kind === "months" ? ` (${d.duration_months}mo)` : ""}
                  </td>
                  <td className="px-4 py-2">
                    <span className="badge bg-stone-200 text-stone-700">{d.state}</span>{" "}
                    {d.below_floor && (
                      <span className="badge bg-red-700/10 text-red-700">below floor</span>
                    )}
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
