import type { Metadata } from "next";
import { listPriceItems, listPriceRules } from "@/lib/db";
import { PricingRowEditor } from "@/components/PricingEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
  const [items, rules] = await Promise.all([
    listPriceItems(),
    listPriceRules(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Pricing</h1>
        <p className="page-sub">
          The system of record for quotes and BD deals (approved v3
          figures). Every edit is audited. Domain is never listed here
          — it is a pass-through line typed per quote.
        </p>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <th scope="col" className="px-3 py-2 font-bold">Item</th>
              <th scope="col" className="px-2 py-2 font-bold">Intl $/mo</th>
              <th scope="col" className="px-2 py-2 font-bold">BD one-time ৳</th>
              <th scope="col" className="px-2 py-2 font-bold">BD ৳/mo</th>
              <th scope="col" className="px-2 py-2 font-bold">BD floor ৳</th>
              <th scope="col" className="px-2 py-2 font-bold">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item) => (
              <PricingRowEditor key={item.key} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      <section className="card" aria-label="Pricing rules">
        <h2 className="mb-2 text-lg font-bold">Standing rules</h2>
        <dl className="space-y-1 text-sm">
          {rules.map((r) => (
            <div key={r.key} className="flex justify-between gap-4">
              <dt className="text-stone-500">{r.note}</dt>
              <dd className="font-mono font-semibold">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
