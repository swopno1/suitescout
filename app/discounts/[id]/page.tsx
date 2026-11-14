import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDiscount,
  getPriceItem,
  getQuote,
  listAdminActionsFor,
} from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { discountActive, discountExpiryDue } from "@/lib/discounts";
import { DiscountActions } from "@/components/DiscountActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discount",
};

export default async function DiscountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const discount = await getDiscount(id);
  if (!discount) notFound();
  const now = new Date();
  const item =
    discount.product === "concierge-subscription"
      ? null
      : await getPriceItem(discount.product);
  const quote =
    (discount.target_type === "quote" || discount.target_type === "hosting") &&
    /^\d+$/.test(discount.target_id)
      ? await getQuote(Number(discount.target_id))
      : null;
  const line = quote?.lines.find(
    (l) => l.key === discount.product && l.unit_minor !== null,
  );
  const history = await listAdminActionsFor("discount", String(id)).catch(
    () => [],
  );
  const active = discountActive(discount, now);
  const expiryDue = discountExpiryDue(discount, now);
  const cur = discount.currency ?? quote?.currency ?? "BDT";

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <Link href="/discounts" className="font-semibold text-brand hover:underline">
          ← All discounts
        </Link>
      </p>
      <div>
        <h1 className="page-title">
          Discount #{discount.id} — {discount.customer_label}
        </h1>
        <p className="page-sub">
          <span className="badge bg-stone-200 text-stone-700">{discount.state}</span>{" "}
          {active && <span className="badge bg-green-700/10 text-green-700">active</span>}{" "}
          {discount.below_floor && (
            <span className="badge bg-red-700/10 text-red-700">below floor</span>
          )}{" "}
          {expiryDue && (
            <span className="badge bg-amber-600/10 text-amber-700">expiry due</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card" aria-label="Discount record">
          <h2 className="mb-2 text-lg font-bold">Record</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Target</dt>
              <dd className="font-mono">
                {discount.target_type}:{discount.target_id}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Product</dt>
              <dd className="font-semibold">{item?.name ?? discount.product}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Value</dt>
              <dd className="font-semibold tabular-nums">
                {discount.kind === "percent"
                  ? `${discount.value_minor}% off`
                  : `${formatMoney(discount.value_minor, discount.currency ?? "BDT")} off`}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Duration</dt>
              <dd>
                {discount.duration_kind}
                {discount.duration_kind === "months"
                  ? ` (${discount.duration_months}mo)`
                  : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Reason</dt>
              <dd className="text-right">{discount.reason}</dd>
            </div>
            {line && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Quote line</dt>
                <dd className="tabular-nums">
                  {formatMoney(line.unit_minor, quote?.currency ?? "BDT")}
                </dd>
              </div>
            )}
            {item?.bd_floor_poisha !== null && item?.bd_floor_poisha !== undefined && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Floor</dt>
                <dd className="tabular-nums">{formatMoney(item.bd_floor_poisha, "BDT")}</dd>
              </div>
            )}
            {discount.stripe_coupon_id && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Stripe coupon</dt>
                <dd className="font-mono">{discount.stripe_coupon_id}</dd>
              </div>
            )}
            {discount.stripe_subscription_id && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Stripe subscription</dt>
                <dd className="font-mono">{discount.stripe_subscription_id}</dd>
              </div>
            )}
            {discount.last_error && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Last error</dt>
                <dd className="text-right font-semibold text-red-700">{discount.last_error}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Approved</dt>
              <dd>
                {discount.approved_by
                  ? `${discount.approved_by} · ${discount.approved_at?.slice(0, 10)}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Applied</dt>
              <dd>{discount.applied_at?.slice(0, 10) ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="card" aria-label="Lifecycle">
          <h2 className="mb-2 text-lg font-bold">Lifecycle</h2>
          <DiscountActions discount={discount} />
        </section>
      </div>

      <section className="card" aria-label="Discount history">
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
