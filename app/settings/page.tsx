import Link from "next/link";
import { businessDaysOut } from "@/lib/agent";
import {
  getAllSettings,
  getDataCounts,
  listPendingFollowups,
} from "@/lib/db";
import { formatWhen } from "@/lib/format";
import {
  KNOWN_MODELS,
  getDefaultModel,
  isInferenceConfigured,
} from "@/lib/inference";
import SettingsForm from "@/components/SettingsForm";
import TestConnectionButton from "@/components/TestConnectionButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, counts, pending] = await Promise.all([
    getAllSettings(),
    getDataCounts(),
    listPendingFollowups(10),
  ]);
  const keyConfigured = isInferenceConfigured();
  const currentModel = settings.inference_model || getDefaultModel();
  const currentDelay = Number(settings.followup_delay_days || "3");

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub mb-4">
        Connection and defaults for the agent. Changes apply to the next
        run — never to drafts already written.
      </p>

      <section className="card mb-4" aria-label="AI connection">
        <h2 className="mb-2 text-lg font-bold">AI connection</h2>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${keyConfigured ? "bg-brand" : "bg-red-600"}`}
          />
          Vultr Serverless Inference key:{" "}
          <strong>
            {keyConfigured
              ? "configured"
              : "not set, add VULTR_INFERENCE_API_KEY to .env"}
          </strong>
        </p>
        <p className="mt-2 text-sm">
          Endpoint:{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px]">
            https://api.vultrinference.com/v1
          </code>
        </p>
        <p className="mt-2 text-sm">
          Effective model:{" "}
          <strong className="font-mono text-[13px]">{currentModel}</strong>
        </p>
        {!keyConfigured && (
          <p className="mt-2 max-w-prose text-sm text-stone-600">
            Without a key the agent still works — deterministic research,
            scoring, and template drafts — but LLM polish and lead
            summaries stay off.
          </p>
        )}
        <div className="mt-3">
          <TestConnectionButton />
        </div>
      </section>

      <section className="card mb-4" aria-label="Agent defaults">
        <h2 className="mb-1 text-lg font-bold">Agent defaults</h2>
        <p className="mb-3 max-w-prose text-sm text-stone-600">
          Which model polishes drafts, and how many business days out a
          follow-up lands. Fridays and Saturdays are skipped —
          Asia/Dhaka time.
        </p>
        <SettingsForm
          currentModel={currentModel}
          currentDelay={Number.isFinite(currentDelay) ? currentDelay : 3}
          models={KNOWN_MODELS.map((m) => ({ id: m.id, label: m.label }))}
        />
      </section>

      <section className="card mb-4" aria-label="Data overview">
        <h2 className="mb-3 text-lg font-bold">Data</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <h3 className="label mb-1.5">Prospects by stage</h3>
            <ul className="space-y-1">
              {Object.entries(counts.byStatus).map(([s, n]) => (
                <li key={s} className="flex justify-between gap-2">
                  <span className="capitalize">{s}</span>
                  <strong className="tabular-nums">{n}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="label mb-1.5">Prospects by band</h3>
            <ul className="space-y-1">
              {Object.entries(counts.byBand).map(([b, n]) => (
                <li key={b} className="flex justify-between gap-2">
                  <span className="capitalize">{b}</span>
                  <strong className="tabular-nums">{n}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="label mb-1.5">Totals</h3>
            <ul className="space-y-1">
              <li className="flex justify-between gap-2">
                <span>Prospects</span>
                <strong className="tabular-nums">{counts.prospects}</strong>
              </li>
              <li className="flex justify-between gap-2">
                <span>Runs</span>
                <strong className="tabular-nums">{counts.runs}</strong>
              </li>
              <li className="flex justify-between gap-2">
                <span>Drafts</span>
                <strong className="tabular-nums">{counts.drafts}</strong>
              </li>
              <li className="flex justify-between gap-2">
                <span>Follow-ups</span>
                <strong className="tabular-nums">{counts.followups}</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Upcoming follow-ups">
        <h2 className="mb-1 text-lg font-bold">Upcoming follow-ups</h2>
        <p className="mb-3 text-sm text-stone-600">
          Due dates count business days only — Fridays and Saturdays are
          skipped, Asia/Dhaka time.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-600">
            Nothing pending. Follow-ups appear here after a run drafts
            them.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {pending.map((f) => {
              const due = businessDaysOut(
                f.due_after_days,
                Date.parse(f.created_at),
              );
              const overdue =
                Date.parse(due) < Date.now() - 24 * 60 * 60 * 1000;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-2"
                >
                  <Link
                    href={`/prospects/${f.prospect_id}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {f.prospect_name}
                  </Link>
                  <span>
                    due <strong className="tabular-nums">{due}</strong>
                  </span>
                  {overdue && (
                    <span className="badge bg-red-700 text-white">
                      overdue
                    </span>
                  )}
                  <span className="text-xs tabular-nums text-stone-400">
                    (created {formatWhen(f.created_at)})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
