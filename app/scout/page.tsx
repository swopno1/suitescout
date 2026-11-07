import Link from "next/link";
import { getScout, listProspectsByIds, listScouts } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import type { Scout } from "@/lib/types";
import RunAutoRefresh from "@/components/RunAutoRefresh";
import ScoutAreaForm from "@/components/ScoutAreaForm";

export const dynamic = "force-dynamic";

const PHASES = [
  { key: "geocoding", label: "Find the place" },
  { key: "searching", label: "Search the area" },
  { key: "importing", label: "Import the leads" },
] as const;

function phaseIndex(s: Scout): number {
  if (s.status === "done") return 3;
  if (s.phase === "importing") return 2;
  if (s.phase === "searching") return 1;
  return 0;
}

const STATUS_BADGE: Record<Scout["status"], string> = {
  running: "bg-amber-600 text-white",
  done: "bg-brand text-white",
  failed: "bg-red-700 text-white",
};

export default async function ScoutPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const scoutId = Number(id);
  const scout =
    id && Number.isFinite(scoutId) ? await getScout(scoutId) : null;
  const findings = scout ? await listProspectsByIds(scout.prospect_ids) : [];
  const history = await listScouts(20);
  const running = scout?.status === "running";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-dark">Scout</h1>
        <p className="mt-1 text-sm text-stone-600">
          Name a town, watch the area turn into leads. Findings land here
          live, then live on the board.
        </p>
      </div>

      <ScoutAreaForm />

      {id && !scout && (
        <p className="rounded-xl bg-red-700/10 px-4 py-3 text-sm text-red-700 ring-1 ring-red-700/30">
          No scout with that id. Pick one from the history below, or start a
          fresh search above.
        </p>
      )}

      {scout && (
        <section className="card">
          <RunAutoRefresh active={running} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-brand-dark">
              {scout.place}
              {scout.display_name &&
                scout.display_name.toLowerCase() !==
                  scout.place.toLowerCase() && (
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    {scout.display_name}
                  </span>
                )}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[scout.status]} ${running ? "live-dot" : ""}`}
            >
              {running ? "scouting…" : scout.status}
            </span>
          </div>

          <ol
            aria-label="Scout progress"
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3"
          >
            {PHASES.map((p, i) => {
              const idx = phaseIndex(scout);
              const done = i < idx;
              const active = running && i === idx;
              return (
                <li
                  key={p.key}
                  aria-current={active ? "step" : undefined}
                  className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                    done
                      ? "bg-brand/10 text-brand-dark ring-1 ring-brand/30"
                      : active
                        ? "bg-amber-600/10 text-amber-800 ring-1 ring-amber-600/30"
                        : "bg-stone-100 text-stone-400 ring-1 ring-stone-200"
                  }`}
                >
                  <span aria-hidden="true">{done ? "✓" : active ? "…" : "·"}</span>
                  {p.label}
                </li>
              );
            })}
          </ol>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[
              ["Found", scout.found],
              ["Junk skipped", scout.junk_skipped],
              ["Already known", scout.dupes_skipped],
              ["Imported", scout.imported],
            ].map(([label, n]) => (
              <div
                key={label as string}
                className="rounded-xl bg-stone-100 px-2 py-3 ring-1 ring-stone-200"
              >
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="text-xl font-semibold text-brand-dark tabular-nums">
                  {n}
                </dd>
              </div>
            ))}
          </dl>

          {scout.status === "failed" && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-700/10 px-4 py-3 text-sm text-red-700 ring-1 ring-red-700/30"
            >
              {scout.error ?? "The scout failed."}
            </p>
          )}

          {findings.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-stone-600">
                Findings ({findings.length})
              </h3>
              <ul className="mt-2 divide-y divide-stone-200 rounded-xl bg-stone-50 ring-1 ring-stone-200">
                {findings.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/prospects/${p.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-stone-100"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-brand-dark">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          {p.location ?? "—"}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand-dark ring-1 ring-brand/30">
                        {p.source}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs text-stone-500">
            Started {formatWhen(scout.started_at)}
            {scout.finished_at &&
              ` · finished ${formatWhen(scout.finished_at)}`}
          </p>
        </section>
      )}

      {history.length > 0 && (
        <section className="card">
          <h2 className="text-base font-semibold text-brand-dark">
            Recent scouts
          </h2>
          <ul className="mt-3 divide-y divide-stone-200">
            {history.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/scout?id=${s.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-stone-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-brand-dark">
                      {s.place}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {formatWhen(s.started_at)} · found {s.found} ·
                      imported {s.imported}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status]}`}
                  >
                    {s.status === "running" ? "scouting…" : s.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
