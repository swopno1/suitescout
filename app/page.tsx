import Link from "next/link";
import { listProspects } from "@/lib/db";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  type Prospect,
  type ScoreBand,
} from "@/lib/types";
import AddProspectForm from "@/components/AddProspectForm";

export const dynamic = "force-dynamic";

const BAND_STYLES: Record<ScoreBand, string> = {
  hot: "bg-accent text-white",
  warm: "bg-amber-600 text-white",
  cold: "bg-slate-500 text-white",
};

function ScoreBadge({ prospect }: { prospect: Prospect }) {
  if (prospect.fit_score === null || !prospect.score_band) {
    return (
      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-600">
        Not scored
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BAND_STYLES[prospect.score_band]}`}
    >
      {prospect.fit_score} · {prospect.score_band}
    </span>
  );
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  return (
    <article className="rounded-lg border border-stone-300 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/prospects/${prospect.id}`}
          className="font-semibold text-brand-dark hover:underline"
        >
          {prospect.name}
        </Link>
        {prospect.demo && (
          <span className="shrink-0 rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-bold text-accent">
            DEMO
          </span>
        )}
      </div>
      {prospect.location && (
        <p className="mt-0.5 text-xs text-stone-500">{prospect.location}</p>
      )}
      {prospect.website && (
        <a
          href={prospect.website}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-xs text-brand hover:underline"
        >
          {prospect.website}
        </a>
      )}
      <div className="mt-2 flex items-center justify-between">
        <ScoreBadge prospect={prospect} />
        <span className="text-[11px] uppercase tracking-wide text-stone-400">
          {prospect.source}
        </span>
      </div>
    </article>
  );
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; location?: string }>;
}) {
  const params = await searchParams;
  const band = params.band || undefined;
  const locationFilter = (params.location || "").toLowerCase();
  const all = listProspects({ band });
  const prospects = locationFilter
    ? all.filter((p) =>
        (p.location || "").toLowerCase().includes(locationFilter),
      )
    : all;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prospect board</h1>
          <p className="text-sm text-stone-600">
            {prospects.length} prospects · {all.length} total · New →
            Researched → Drafted → Contacted → Replied
          </p>
        </div>
        <form className="flex gap-2" method="get">
          <select
            name="band"
            defaultValue={band || ""}
            className="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All bands</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <input
            name="location"
            defaultValue={params.location || ""}
            placeholder="Filter by location"
            className="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white"
          >
            Filter
          </button>
        </form>
      </div>

      <AddProspectForm />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {PROSPECT_STATUSES.map((status) => {
          const cards = prospects.filter((p) => p.status === status);
          return (
            <section
              key={status}
              className="rounded-lg border border-stone-300 bg-stone-100 p-2"
            >
              <h2 className="mb-2 flex items-center justify-between px-1 pt-1 text-sm font-bold">
                {PROSPECT_STATUS_LABELS[status]}
                <span className="rounded-full bg-stone-300 px-2 py-0.5 text-xs">
                  {cards.length}
                </span>
              </h2>
              <div className="space-y-2">
                {cards.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-stone-500">
                    No prospects here yet.
                  </p>
                ) : (
                  cards.map((p) => (
                    <ProspectCard key={p.id} prospect={p} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
