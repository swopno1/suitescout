import type { Metadata } from "next";
import Link from "next/link";
import { countDrafts, countFollowups, listProspects } from "@/lib/db";
import { getConciergeSnapshot } from "@/lib/concierge-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business board",
};

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
    </div>
  );
}

export default async function BoardPage() {
  const [prospects, draftsReady, followupsSet, concierge] =
    await Promise.all([
      listProspects(),
      countDrafts(),
      countFollowups(),
      getConciergeSnapshot(),
    ]);
  const bandCount = (b: string) =>
    prospects.filter((p) => p.score_band === b).length;
  const inTalks = prospects.filter(
    (p) => p.status === "contacted" || p.status === "replied",
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">ViveReply business board</h1>
        <p className="page-sub">
          The whole business at a glance. Every figure below is read
          from a live database — nothing is a placeholder.
        </p>
      </div>

      <section className="card" aria-label="Sales snapshot">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Sales</h2>
          <Link
            href="/sales"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Open the pipeline →
          </Link>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <Stat value={prospects.length} label="Prospects" />
          <Stat value={bandCount("hot")} label="Hot" />
          <Stat value={bandCount("warm")} label="Warm" />
          <Stat value={bandCount("cold")} label="Cold" />
          <Stat value={inTalks} label="In talks" />
          <Stat value={draftsReady} label="Drafts ready" />
          <Stat value={followupsSet} label="Follow-ups set" />
        </dl>
      </section>

      <section className="card" aria-label="Customers">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Customers</h2>
          <Link
            href="/customers"
            className="text-sm font-semibold text-brand hover:underline"
          >
            All customers →
          </Link>
        </div>
        {concierge.status === "unconfigured" && (
          <p className="text-sm text-stone-600">
            Concierge link not configured. Set CONCIERGE_DATABASE_URL
            on the server to see live customer figures here.
          </p>
        )}
        {concierge.status === "unreachable" && (
          <p className="text-sm text-stone-600">
            Concierge link unreachable — the database did not answer,
            so nothing is shown rather than stale figures. Check the
            server logs and the connection string.
          </p>
        )}
        {concierge.status === "ok" && (
          <>
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              <Stat
                value={`${concierge.snapshot.ownersActive}/${concierge.snapshot.ownersTotal}`}
                label="Owner accounts active"
              />
              <Stat
                value={`${concierge.snapshot.propertiesActive}/${concierge.snapshot.propertiesTotal}`}
                label="Properties active"
              />
              <Stat
                value={concierge.snapshot.conversationsThisMonth}
                label="Conversations this month"
              />
            </dl>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <h3 className="label mb-1">Plan mix</h3>
                {concierge.snapshot.planMix.length === 0 ? (
                  <p className="text-sm text-stone-600">
                    No subscriptions yet.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {concierge.snapshot.planMix.map((row) => (
                      <li
                        key={row.tier}
                        className="flex items-baseline justify-between gap-4"
                      >
                        <span className="font-semibold">{row.tier}</span>
                        <span className="tabular-nums">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="label mb-1">Trials ending within 7 days</h3>
                {concierge.snapshot.trialsEnding.length === 0 ? (
                  <p className="text-sm text-stone-600">
                    None — no trial ends in the next 7 days.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {concierge.snapshot.trialsEnding.map((t) => (
                      <li
                        key={`${t.propertyName}-${t.trialEndsAt}`}
                        className="flex items-baseline justify-between gap-4"
                      >
                        <span className="font-semibold">
                          {t.propertyName}
                        </span>
                        <span className="tabular-nums">
                          {t.trialEndsAt.slice(0, 10)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-stone-100 pt-3">
              <Stat
                value={
                  concierge.snapshot.stripeActive.length === 0
                    ? "0"
                    : concierge.snapshot.stripeActive
                        .map((r) => `${r.count} ${r.interval.toLowerCase()}`)
                        .join(" + ")
                }
                label="Stripe-active properties"
              />
              <Stat
                value={concierge.snapshot.manualLive}
                label="Manual billing live"
              />
            </dl>
            <p className="mt-3 text-xs text-stone-500">
              MRR is not estimated: Concierge prices are not locked
              anywhere (the pricing worksheet holds no figures — S4
              owns pricing). Manual/BD arrangements never enter a
              Stripe-based figure.
            </p>
          </>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card" aria-label="Invoices">
          <h2 className="mb-1 text-lg font-bold">Invoices</h2>
          <p className="text-sm text-stone-600">
            Not connected yet — BD invoicing lands in S5.
          </p>
        </section>
        <section className="card" aria-label="Business health">
          <h2 className="mb-1 text-lg font-bold">Business health</h2>
          <p className="text-sm text-stone-600">
            Not connected yet — automated health checks land in S6.
          </p>
        </section>
      </div>
    </div>
  );
}
