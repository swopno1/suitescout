import Link from "next/link";
import { getLatestRun, getProspect, getRun, listProspects } from "@/lib/db";
import type { RunStep } from "@/lib/types";
import StartRunButton from "@/components/StartRunButton";

export const dynamic = "force-dynamic";

const STEP_STYLES: Record<RunStep["status"], string> = {
  pending: "bg-stone-200 text-stone-600",
  running: "bg-amber-600 text-white",
  done: "bg-brand text-white",
  failed: "bg-red-700 text-white",
};

function StepTrace({ steps }: { steps: RunStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li
          key={step.name}
          className="rounded-lg border border-stone-300 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {i + 1}. {step.name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STEP_STYLES[step.status]}`}
            >
              {step.status}
            </span>
          </div>
          {step.note && (
            <p className="mt-2 text-sm text-stone-600">{step.note}</p>
          )}
          {step.output && (
            <p className="mt-2 whitespace-pre-wrap text-sm">{step.output}</p>
          )}
          {step.evidence.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {step.evidence.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {(step.started || step.finished) && (
            <p className="mt-2 text-xs text-stone-400">
              {step.started ? `started ${step.started}` : ""}
              {step.finished ? ` · finished ${step.finished}` : ""}
            </p>
          )}
        </li>
      ))}
    </ol>
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

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Run view</h1>
      <p className="mb-4 text-sm text-stone-600">
        Pick a prospect, run the agent, and watch the five steps —
        Research → Score → Draft → Log → Follow up — with evidence at
        every step. This is the demo&apos;s hero shot.
      </p>

      {run && run.status === "queued" && (
        <div className="mb-4 rounded-lg border border-amber-600 bg-amber-50 p-3 text-sm">
          <strong>Scaffold stub.</strong> This run is queued — the agent
          executor lands Friday. No agent has run yet, no research was
          fetched, and no draft was written. The five steps below are the
          plan, not a result.
        </div>
      )}

      {run ? (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              Run #{run.id}
              {(() => {
                const p = getProspect(run.prospect_id);
                return p ? (
                  <>
                    {" — "}
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
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
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
            <span className="text-xs text-stone-500">
              started {run.started_at}
            </span>
          </div>
          <StepTrace steps={run.steps} />
        </div>
      ) : (
        <p className="mb-6 rounded-lg border border-stone-300 bg-white p-4 text-sm text-stone-600">
          No runs yet. Start one below.
        </p>
      )}

      <h2 className="mb-2 text-lg font-semibold">Start a run</h2>
      <div className="space-y-2">
        {prospects.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-300 bg-white p-3"
          >
            <div>
              <span className="font-semibold">{p.name}</span>
              {p.demo && (
                <span className="ml-2 rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  DEMO
                </span>
              )}
              {p.location && (
                <span className="ml-2 text-sm text-stone-500">
                  {p.location}
                </span>
              )}
            </div>
            <StartRunButton prospectId={p.id} prospectName={p.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
