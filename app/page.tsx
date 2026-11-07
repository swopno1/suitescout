import Link from "next/link";
import { countDrafts, countFollowups, listProspects } from "@/lib/db";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  type Prospect,
} from "@/lib/types";
import { matchesProspect } from "@/lib/board-search";
import { domainOf } from "@/lib/prospect-label";
import AddProspectForm from "@/components/AddProspectForm";
import BatchRunButton from "@/components/BatchRunButton";

export const dynamic = "force-dynamic";

const BAND_STYLES: Record<string, string> = {
  hot: "bg-accent text-white",
  warm: "bg-amber-600 text-white",
  cold: "bg-slate-500 text-white",
};

const COLUMN_DOT: Record<(typeof PROSPECT_STATUSES)[number], string> = {
  new: "bg-stone-400",
  researched: "bg-brand",
  drafted: "bg-amber-600",
  contacted: "bg-accent",
  replied: "bg-emerald-600",
  closed: "bg-stone-700",
};

function ScoreBadge({ prospect }: { prospect: Prospect }) {
  if (prospect.fit_score === null || !prospect.score_band) {
    return (
      <span className="badge bg-stone-200 text-stone-600">Not scored</span>
    );
  }
  return (
    <span className={`badge ${BAND_STYLES[prospect.score_band]}`}>
      <span className="tabular-nums">{prospect.fit_score}</span>
      <span className="capitalize">{prospect.score_band}</span>
    </span>
  );
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const sub =
    prospect.location?.trim() ||
    (prospect.website?.trim() ? domainOf(prospect.website) : "") ||
    "No details yet";
  return (
    <article className="card card-hover !p-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/prospects/${prospect.id}`}
          className="font-semibold leading-snug text-brand-dark hover:underline"
        >
          {prospect.name}
        </Link>
        {prospect.demo && (
          <span className="badge shrink-0 bg-accent-light text-[10px] font-bold uppercase tracking-wide text-accent">
            Demo
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-xs text-stone-500">{sub}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <ScoreBadge prospect={prospect} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
          {prospect.source}
        </span>
      </div>
    </article>
  );
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; q?: string }>;
}) {
  const params = await searchParams;
  const band = params.band || undefined;
  const query = (params.q || "").trim();
  // Stats always count the full board; filters apply to the columns only.
  const everything = await listProspects();
  const prospects = everything.filter(
    (p) =>
      (!band || p.score_band === band) &&
      matchesProspect(
        {
          name: p.name,
          website: p.website,
          location: p.location,
          ota_listings: p.research?.ota_listings ?? [],
          demand_signals: p.research?.demand_signals ?? [],
          score_band: p.score_band,
        },
        query,
      ),
  );
  const [draftsReady, followupsSet] = await Promise.all([
    countDrafts(),
    countFollowups(),
  ]);
  const newCount = everything.filter((p) => p.status === "new").length;

  const bandCount = (b: string) =>
    everything.filter((p) => p.score_band === b).length;
  const statusCount = (s: string) =>
    everything.filter((p) => p.status === s).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Prospect board</h1>
          <p className="page-sub">
            Pipeline from first sighting to reply. Every score cites its
            evidence.
          </p>
        </div>
        <BatchRunButton newCount={newCount} />
      </div>

      <dl className="card mb-4 flex flex-wrap gap-x-8 gap-y-2 !py-3">
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums">
            {everything.length}
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Prospects
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums text-accent">
            {bandCount("hot")}
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Hot
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums text-amber-700">
            {bandCount("warm")}
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Warm
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums text-slate-500">
            {bandCount("cold")}
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Cold
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums">
            {statusCount("contacted") + statusCount("replied")}
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            In talks
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums">{draftsReady}</dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Drafts ready
          </dt>
        </div>
        <div className="flex items-baseline gap-2">
          <dd className="text-xl font-extrabold tabular-nums">
            {followupsSet}
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Follow-ups set
          </dt>
        </div>
      </dl>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap gap-2" method="get">
          <select
            name="band"
            defaultValue={band || ""}
            aria-label="Filter by score band"
            className="input"
          >
            <option value="">All bands</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search name, place, site, OTA…"
            aria-label="Search prospects"
            className="input w-64"
          />
          <button type="submit" className="btn-ghost !py-2">
            Filter
          </button>
        </form>
        {(band || query) && (
          <p className="text-sm text-stone-600">
            Showing {prospects.length} of {everything.length}{" "}
            <Link href="/" className="font-semibold text-brand hover:underline">
              Clear
            </Link>
          </p>
        )}
      </div>

      <AddProspectForm />

      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {PROSPECT_STATUSES.map((status) => {
          const cards = prospects.filter((p) => p.status === status);
          return (
            <section
              key={status}
              aria-label={`${PROSPECT_STATUS_LABELS[status]} prospects`}
              className="flex h-[62vh] min-h-80 flex-col rounded-xl bg-stone-800/[0.05] p-2"
            >
              <h2 className="mb-2 flex shrink-0 items-center justify-between px-1.5 pt-1 text-[13px] font-bold">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`}
                  />
                  {PROSPECT_STATUS_LABELS[status]}
                </span>
                <span className="badge bg-white tabular-nums text-stone-600 shadow-sm">
                  {cards.length}
                </span>
              </h2>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-stone-300 px-2 py-4 text-center text-xs text-stone-400">
                    Nothing here yet
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
