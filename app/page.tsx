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

const COLUMN_DOT: Record<(typeof PROSPECT_STATUSES)[number], string> = {
  new: "bg-stone-400",
  researched: "bg-brand",
  drafted: "bg-amber-600",
  contacted: "bg-accent",
  replied: "bg-emerald-600",
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
      {prospect.location && (
        <p className="mt-0.5 truncate text-xs text-stone-500">
          {prospect.location}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <ScoreBadge prospect={prospect} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
          {prospect.source}
        </span>
      </div>
    </article>
  );
}

/** Band counts that double as the band filter — one control, not two. */
function BandStrip({
  prospects,
  activeBand,
  locationQuery,
}: {
  prospects: Prospect[];
  activeBand?: string;
  locationQuery: string;
}) {
  const count = (band: ScoreBand) =>
    prospects.filter((p) => p.score_band === band).length;
  const unscored = prospects.filter((p) => p.fit_score === null).length;
  const loc = locationQuery ? `&location=${encodeURIComponent(locationQuery)}` : "";
  const bands: { key: ScoreBand | ""; label: string; n: number; dot: string }[] = [
    { key: "", label: "All", n: prospects.length, dot: "bg-ink" },
    { key: "hot", label: "Hot", n: count("hot"), dot: "bg-accent" },
    { key: "warm", label: "Warm", n: count("warm"), dot: "bg-amber-600" },
    { key: "cold", label: "Cold", n: count("cold"), dot: "bg-slate-500" },
  ];
  return (
    <div className="card flex flex-wrap items-center gap-x-2 gap-y-2 !py-2.5">
      {bands.map((b) => {
        const active = (activeBand || "") === b.key;
        return (
          <Link
            key={b.label}
            href={`/?band=${b.key}${loc}`}
            aria-current={active ? "true" : undefined}
            className={`flex items-baseline gap-2 rounded-lg px-3 py-1.5 transition-colors ${
              active ? "bg-brand-dark text-cream" : "hover:bg-brand-light"
            }`}
          >
            <span
              className={`text-xl font-extrabold tabular-nums ${active ? "" : b.key === "hot" ? "text-accent" : b.key === "warm" ? "text-amber-700" : b.key === "cold" ? "text-slate-500" : "text-ink"}`}
            >
              {b.n}
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${active ? "text-cream/90" : "text-stone-500"}`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${active ? "bg-cream" : b.dot}`}
              />
              {b.label}
            </span>
          </Link>
        );
      })}
      <span className="ml-auto hidden items-baseline gap-2 px-2 sm:flex">
        <span className="text-xl font-extrabold tabular-nums text-stone-400">
          {unscored}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          unscored
        </span>
      </span>
    </div>
  );
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; location?: string }>;
}) {
  const params = await searchParams;
  const band = params.band || undefined;
  const locationQuery = params.location || "";
  const locationFilter = locationQuery.toLowerCase();
  const all = listProspects();
  const banded = band ? all.filter((p) => p.score_band === band) : all;
  const prospects = locationFilter
    ? banded.filter((p) =>
        (p.location || "").toLowerCase().includes(locationFilter),
      )
    : banded;

  return (
    <div>
      <div className="mb-4">
        <h1 className="page-title">Prospect board</h1>
        <p className="page-sub">
          Pipeline from first sighting to reply. Every score cites its
          evidence.
        </p>
      </div>

      <div className="mb-4">
        <BandStrip
          prospects={all}
          activeBand={band}
          locationQuery={locationQuery}
        />
      </div>

      {(band || locationFilter) && (
        <p className="mb-3 text-sm text-stone-600">
          Showing {prospects.length} of {all.length} prospects.{" "}
          <Link href="/" className="font-semibold text-brand hover:underline">
            Clear filters
          </Link>
        </p>
      )}

      <div className="mb-4">
        <form className="flex flex-wrap gap-2" method="get">
          {band && <input type="hidden" name="band" value={band} />}
          <input
            name="location"
            defaultValue={locationQuery}
            placeholder="Filter by location, e.g. Cox's Bazar"
            aria-label="Filter by location"
            className="input w-64"
          />
          <button type="submit" className="btn-ghost !py-2">
            Filter
          </button>
        </form>
      </div>

      <AddProspectForm />

      <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-5">
        {PROSPECT_STATUSES.map((status) => {
          const cards = prospects.filter((p) => p.status === status);
          return (
            <section
              key={status}
              aria-label={`${PROSPECT_STATUS_LABELS[status]} prospects`}
              className="rounded-xl bg-stone-800/[0.05] p-2"
            >
              <h2 className="mb-2 flex items-center justify-between px-1.5 pt-1 text-[13px] font-bold">
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
              <div className="space-y-2">
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
