import { getAllSettings, listProspects } from "@/lib/db";
import {
  KNOWN_MODELS,
  getDefaultModel,
  isInferenceConfigured,
} from "@/lib/inference";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = getAllSettings();
  const currentModel = settings.inference_model || getDefaultModel();
  const currentDelay = Number(settings.followup_delay_days || "3");
  const keyConfigured = isInferenceConfigured();
  const prospectCount = listProspects().length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Settings</h1>
      <p className="mb-4 text-sm text-stone-600">
        Model and follow-up defaults for the agent. Changes apply to the
        next run.
      </p>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-stone-300 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">Inference</h2>
          <p className="text-sm">
            Vultr Serverless Inference key:{" "}
            <strong>
              {keyConfigured ? "configured" : "NOT SET — add VULTR_INFERENCE_API_KEY to .env"}
            </strong>
          </p>
          <p className="mt-1 text-sm">
            Endpoint:{" "}
            <code className="rounded bg-stone-100 px-1">
              https://api.vultrinference.com/v1
            </code>
          </p>
          <p className="mt-1 text-sm">
            Effective model: <strong>{currentModel}</strong>
          </p>
        </div>
        <div className="rounded-lg border border-stone-300 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">Seed data</h2>
          <p className="text-sm">
            {prospectCount} prospects seeded from the verified batch-3
            research (source: batch3). No contact details are stored in
            this repo.
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Build spec: <code>docs/BUILD-SPEC.md</code> in the repo.
          </p>
        </div>
      </div>

      <SettingsForm
        currentModel={currentModel}
        currentDelay={Number.isFinite(currentDelay) ? currentDelay : 3}
        models={KNOWN_MODELS.map((m) => ({ id: m.id, label: m.label }))}
      />
    </div>
  );
}
