import Link from "next/link";
import {
  getLatestRun,
  getProspect,
  getRun,
  listAllRuns,
  listProspects,
} from "@/lib/db";
import { formatWhen } from "@/lib/format";
import type { Prospect, RunStep } from "@/lib/types";
import BatchRunButton from "@/components/BatchRunButton";
import RunAutoRefresh from "@/components/RunAutoRefresh";
import RunStarter from "@/components/RunStarter";
import SafeLink from "@/components/SafeLink";
import StartRunButton from "@/components/StartRunButton";

export const dynamic = "force-dynamic";

const STEP_PILL: Record<RunStep["status"], string> = {
  pending: "bg-stone-200 text-stone-600",
  running: "bg-amber-600 text-white",
  done: "bg-brand text-white",
  failed: "bg-red-700 text-white",
};

/** The five-step loop as a pipeline rail — progress at a glance. */
function PipelineRail({ steps }: { steps: RunStep[] }) {
  return (
    <ol
      aria-label="Agent loop progress"
      className="card flex items-start gap-0 overflow-x-auto !p-4"
    >
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={step.name}
            className={`flex min-w-28 flex-1 items-start ${last ? "" : "w-full"}`}
          >
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  step.status === "done"
                    ? "bg-brand text-white"
                    : step.status === "running"
                      ? "bg-amber-600 text-white"
                      : step.status === "failed"
                        ? "bg-red-700 text-white"
                        : "bg-stone-200 text-stone-500"
                } ${step.status === "running" ? "live-dot text-amber-600" : ""}`}
                aria-label={`${step.name}: ${step.status}`}
              >
                {step.status === "done" ? (
                  <span aria-hidden="true">✓</span>
                ) : step.status === "failed" ? (
                  <span aria-hidden="true">✕</span>
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
              </span>
              <span className="text-xs font-semibold leading-tight">
                {step.name}
              </span>
              <span className="text-[11px] capitalize text-stone-500">
                {step.status}
              </span>
            </div>
            {!last && (
              <span
                aria-hidden="true"
                className={`mx-1 mt-4 h-0.5 min-w-4 flex-1 rounded-full ${
                  step.status === "done" ? "bg-brand" : "bg-stone-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepTrace({ steps }: { steps: RunStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step.name} className="card">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-dark text-xs tabular-nums text-cream">
                {i + 1}
              </span>
              {step.name}
            </span>
            <span className={`badge ${STEP_PILL[step.status]}`}>
              {step.status}
            </span>
          </div>
          {step.note && (
            <p className="mt-2 text-sm text-stone-600">{step.note}</p>
          )}
          {step.output && <p className="mono-block mt-2">{step.output}</p>}
          {step.evidence.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {step.evidence.map((url) => (
                <li key={url} className="max-w-full">
                  <SafeLink
                    href={url}
                    title={url}
                    className="badge max-w-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white"
                  >
                    <span className="max-w-64 truncate sm:max-w-96">
                      {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </SafeLink>
                </li>
              ))}
            </ul>
          )}
          {(step.started || step.finished) && (
            <p className="mt-2 text-xs tabular-nums text-stone-400">
              {step.started ? `started ${formatWhen(step.started)}` : ""}
              {step.finished ? `, finished ${formatWhen(step.finished)}` : ""}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function MiniScore({ prospect }: { prospect: Prospect }) {
  if (prospect.fit_score === null || !prospect.score_band) {
    return (
      <span className="badge bg-stone-200 text-stone-600">Not scored</span>
    );
  }
  const style =
    prospect.score_band === "hot"
      ? "bg-accent text-white"
      : prospect.score_band === "warm"
        ? "bg-amber-600 text-white"
        : "bg-slate-500 text-white";
  return (
    <span className={`badge ${style}`}>
      <span className="tabular-nums">{prospect.fit_score}</span>
      <span className="capitalize">{prospect.score_band}</span>
    </span>
  );
}

export default async function RunPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const runId = params.id ? Number(params.id) : NaN;
  const [run, runs, prospects] = await Promise.all([
    Number.isFinite(runId) ? getRun(runId) : getLatestRun(),
    listAllRuns(50),
    listProspects(),
  ]);
  const runProspect = run ? await getProspect(run.prospect_id) : null;
  const live =
    !!run && (run.status === "queued" || run.status === "running");
  const newCount = prospects.filter((p) => p.status === "new").length;
  const activeCount = runs.filter(
    (r) => r.status === "queued" || r.status === "running",
  ).length;
  const nameById = new Map(prospects.map((p) => [p.id, p.name]));

  return (
    <div>
      <h1 className="page-title">Runs</h1>
      <p className="page-sub mb-4">
        A run is the agent doing one prospect end to end: research live,
        score it, draft the pitch. Drafts always wait for a human.
      </p>

      {live && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-600/40 bg-amber-50 p-3 text-sm">
          <span
            aria-hidden="true"
            className="live-dot relative h-2.5 w-2.5 shrink-0 rounded-full bg-amber-600 text-amber-600"
          />
          <p>
            <strong>Agent is working.</strong> Steps update live below
            until the run finishes.
            {activeCount > 1 && (
              <>
                {" "}
                <span className="tabular-nums">{activeCount - 1}</span>{" "}
                more run{activeCount - 1 === 1 ? " is" : "s are"} active
                behind it.
              </>
            )}
          </p>
        </div>
      )}
      <RunAutoRefresh active={live} />

      {run ? (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">
              Run <span className="tabular-nums">#{run.id}</span>
              {runProspect && (
                <>
                  {" for "}
                  <Link
                    href={`/prospects/${runProspect.id}`}
                    className="text-brand hover:underline"
                  >
                    {runProspect.name}
                  </Link>
                </>
              )}
            </h2>
            <span
              className={`badge ${
                run.status === "done"
                  ? "bg-brand text-white"
                  : run.status === "failed"
                    ? "bg-red-700 text-white"
                    : run.status === "running"
                      ? "bg-amber-600 text-white"
                      : "bg-stone-200 text-stone-600"
              }`}
            >
              {run.status}
            </span>
            <span className="text-xs tabular-nums text-stone-500">
              started {formatWhen(run.started_at)}
            </span>
          </div>
          <div className="mb-3">
            <PipelineRail steps={run.steps} />
          </div>
          <StepTrace steps={run.steps} />
        </div>
      ) : (
        <p className="card mb-6 text-sm text-stone-600">
          No runs yet. Start one below.
        </p>
      )}

      <section className="card mb-4" aria-label="Start a run">
        <h2 className="mb-3 text-lg font-bold">Start a run</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="label mb-2">Single prospect</h3>
            <RunStarter
              prospects={prospects.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
              }))}
            />
          </div>
          <div>
            <h3 className="label mb-2">Whole pipeline</h3>
            <p className="mb-2 text-sm text-stone-600">
              Fires one run per New prospect through the same path as a
              single run. Already-running prospects are skipped, never
              duplicated.
            </p>
            <BatchRunButton newCount={newCount} />
          </div>
        </div>
      </section>

      <section className="card" aria-label="Run history">
        <h2 className="mb-2 text-lg font-bold">History</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-stone-600">
            No runs yet. Start one above, or pick a prospect on the{" "}
            <Link href="/board" className="font-semibold text-brand hover:underline">
              board
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <th scope="col" className="py-2 pr-3 font-bold">Run</th>
                  <th scope="col" className="py-2 pr-3 font-bold">Prospect</th>
                  <th scope="col" className="py-2 pr-3 font-bold">Status</th>
                  <th scope="col" className="py-2 pr-3 font-bold">Started</th>
                  <th scope="col" className="py-2 font-bold">
                    <span className="sr-only">Retry</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/run?id=${r.id}`}
                        className="font-bold tabular-nums text-brand hover:underline"
                      >
                        #{r.id}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/prospects/${r.prospect_id}`}
                        className="hover:underline"
                      >
                        {nameById.get(r.prospect_id) ??
                          `Prospect ${r.prospect_id}`}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`badge ${
                          r.status === "done"
                            ? "bg-brand text-white"
                            : r.status === "failed"
                              ? "bg-red-700 text-white"
                              : r.status === "running"
                                ? "bg-amber-600 text-white"
                                : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs tabular-nums text-stone-500">
                      {formatWhen(r.started_at)}
                    </td>
                    <td className="py-2 text-right">
                      {r.status === "failed" && (
                        <StartRunButton
                          prospectId={r.prospect_id}
                          label="Retry"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4" aria-label="Prospects">
        <h2 className="mb-2 text-lg font-bold">Prospects</h2>
        <div className="space-y-2">
          {prospects.map((p) => (
            <div
              key={p.id}
              className="card flex flex-wrap items-center justify-between gap-3 !py-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={`/prospects/${p.id}`}
                  className="font-semibold text-brand-dark hover:underline"
                >
                  {p.name}
                </Link>
                {p.demo && (
                  <span className="badge bg-accent-light text-[10px] font-bold uppercase tracking-wide text-accent">
                    Demo
                  </span>
                )}
                {p.location && (
                  <span className="truncate text-sm text-stone-500">
                    {p.location}
                  </span>
                )}
                <MiniScore prospect={p} />
              </div>
              <StartRunButton prospectId={p.id} prospectName={p.name} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
