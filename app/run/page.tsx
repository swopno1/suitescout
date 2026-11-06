import Link from "next/link";
import { getLatestRun, getProspect, getRun, listProspects } from "@/lib/db";
import type { Prospect, RunStep } from "@/lib/types";
import StartRunButton from "@/components/StartRunButton";
import RunAutoRefresh from "@/components/RunAutoRefresh";

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
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={url}
                    className="badge max-w-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white"
                  >
                    <span className="max-w-64 truncate sm:max-w-96">
                      {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {(step.started || step.finished) && (
            <p className="mt-2 text-xs tabular-nums text-stone-400">
              {step.started ? `started ${step.started}` : ""}
              {step.finished ? `, finished ${step.finished}` : ""}
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
  const run = Number.isFinite(runId) ? getRun(runId) : getLatestRun();
  const prospects = listProspects();
  const live =
    !!run && (run.status === "queued" || run.status === "running");

  return (
    <div>
      <h1 className="page-title">Run view</h1>
      <p className="page-sub mb-4">
        Pick a prospect, run the agent, watch the five steps land with
        evidence attached.
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
          </p>
        </div>
      )}
      <RunAutoRefresh active={live} />

      {run ? (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">
              Run <span className="tabular-nums">#{run.id}</span>
              {(() => {
                const p = getProspect(run.prospect_id);
                return p ? (
                  <>
                    {" for "}
                    <Link
                      href={`/prospects/${p.id}`}
                      className="text-brand hover:underline"
                    >
                      {p.name}
                    </Link>
                  </>
                ) : null;
              })()}
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
              started {run.started_at}
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

      <h2 className="mb-2 text-lg font-bold">Start a run</h2>
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
    </div>
  );
}
