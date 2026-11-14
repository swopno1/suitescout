import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCustomer,
  stateLabel,
  type CustomerDetail as Customer,
} from "@/lib/concierge-db";
import { listAdminActionsFor } from "@/lib/db";
import { HoldForm, ManualApprovalForm } from "@/components/CustomerActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer",
};

function fmtDay(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getCustomer(id);

  if (res.status === "ok" && !res.data) notFound();

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <Link
          href="/customers"
          className="font-semibold text-brand hover:underline"
        >
          ← All customers
        </Link>
      </p>

      {res.status === "unconfigured" && (
        <p className="card text-sm text-stone-600">
          Concierge link not configured. Set CONCIERGE_DATABASE_URL on
          the server to see customers here.
        </p>
      )}
      {res.status === "unreachable" && (
        <p className="card text-sm text-stone-600">
          Concierge link unreachable — the database did not answer, so
          nothing is shown rather than stale figures. Check the server
          logs and the connection string.
        </p>
      )}
      {res.status === "ok" && res.data && (
        <DetailBody propertyId={id} customer={res.data} />
      )}
    </div>
  );
}

async function DetailBody({
  propertyId,
  customer: c,
}: {
  propertyId: string;
  customer: Customer;
}) {
  const actions = await listAdminActionsFor(
    "concierge-property",
    propertyId,
  ).catch(() => []);
  const usagePct =
    c.quotaThisMonth > 0
      ? Math.min(100, Math.round((c.usageThisMonth / c.quotaThisMonth) * 100))
      : 0;

  return (
    <>
      <div>
        <h1 className="page-title">{c.name}</h1>
        <p className="page-sub">
          <span className="badge bg-stone-200 text-stone-700">
            {stateLabel(c.customerState)}
          </span>{" "}
          <span className="text-stone-500">
            {c.propertyStatus} · since {fmtDay(c.createdAt)}
          </span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card" aria-label="Account">
          <h2 className="mb-2 text-lg font-bold">Account</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Owners</dt>
              <dd className="text-right font-semibold">
                {c.owners.length > 0 ? c.owners.join(", ") : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Plan</dt>
              <dd className="font-semibold">
                {c.plan ?? "—"}
                {c.manual ? " (manual)" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Trial ends</dt>
              <dd className="tabular-nums">{fmtDay(c.trialEndsAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Period ends</dt>
              <dd className="tabular-nums">{fmtDay(c.periodEnd)}</dd>
            </div>
            {c.manual && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Manual through</dt>
                <dd className="tabular-nums">
                  {fmtDay(c.manualPeriodEnd)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Stripe</dt>
              <dd>
                {c.stripeCustomerId ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${c.stripeCustomerId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    Open customer ↗
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card" aria-label="Usage">
          <h2 className="mb-2 text-lg font-bold">Usage</h2>
          <p className="text-sm font-semibold text-gray-900">
            {c.usageThisMonth.toLocaleString()} /{" "}
            {c.quotaThisMonth.toLocaleString()} conversations this month (
            {usagePct}%)
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
            role="img"
            aria-label={`${usagePct}% of quota used`}
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <h3 className="label mb-1 mt-3">By week (8 weeks)</h3>
          {c.weeklyConversations.length === 0 ? (
            <p className="text-sm text-stone-600">No conversations yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {c.weeklyConversations.map((w) => (
                <li
                  key={w.week}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="tabular-nums text-stone-500">
                    w/c {w.week}
                  </span>
                  <span className="font-semibold tabular-nums">{w.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-label="Connections">
          <h2 className="mb-2 text-lg font-bold">Connections</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Suite binding</dt>
              <dd className="font-semibold">
                {c.binding ? c.binding.suiteBaseUrl : "not connected"}
              </dd>
            </div>
            {c.binding && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Binding test</dt>
                <dd>
                  {c.binding.lastTestOk === null
                    ? "never tested"
                    : c.binding.lastTestOk
                      ? `ok (${fmtDay(c.binding.lastTestedAt)})`
                      : `failing (${fmtDay(c.binding.lastTestedAt)})`}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Widget domains</dt>
              <dd className="text-right">
                {c.approvedDomains.length === 0
                  ? "none approved"
                  : c.approvedDomains.join(", ")}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card" aria-label="Suspend or reactivate">
          <h2 className="mb-1 text-lg font-bold">
            {c.adminHold ? "Reactivate" : "Suspend"}
          </h2>
          <p className="mb-3 text-sm text-stone-600">
            {c.adminHold
              ? "This property is on hold: guest chat answers the paused message. Reactivating restores service immediately."
              : "Suspend pauses guest chat at once (widget + owner chat); the owner dashboard shows “Paused by ViveReply”. Data is kept."}
          </p>
          <HoldForm propertyId={propertyId} onHold={c.adminHold} />
        </section>
      </div>

      <section className="card" aria-label="Manual subscription">
        <h2 className="mb-1 text-lg font-bold">Manual subscription</h2>
        <p className="mb-3 text-sm text-stone-600">
          For clients paying outside Stripe (bKash/bank): sets plan +
          paid-through date so the billing gate treats them as paid.
          Expiry pauses like a lapsed subscription; renewal is another
          approval. Never touches Stripe objects.
        </p>
        <ManualApprovalForm propertyId={propertyId} />
      </section>

      <section className="card" aria-label="Admin history">
        <h2 className="mb-2 text-lg font-bold">Admin history</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-stone-600">
            No admin actions recorded for this property yet.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {actions.map((a) => (
              <li key={a.id} className="py-2">
                <p className="font-semibold">
                  {a.action}{" "}
                  <span className="font-normal text-stone-500">
                    by {a.actor} · {a.at.slice(0, 16).replace("T", " ")}
                  </span>
                </p>
                <p className="text-stone-600">Reason: {a.reason}</p>
                <p className="mono-block mt-1">
                  {JSON.stringify({ before: a.before, after: a.after })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
