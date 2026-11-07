import { getAllSettings, listProspects } from "@/lib/db";
import {
  KNOWN_MODELS,
  getDefaultModel,
  isInferenceConfigured,
} from "@/lib/inference";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getAllSettings();
  const currentModel = settings.inference_model || getDefaultModel();
  const currentDelay = Number(settings.followup_delay_days || "3");
  const keyConfigured = isInferenceConfigured();
  const prospectCount = (await listProspects()).length;

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub mb-4">
        Model and follow-up defaults for the agent. Changes apply to the
        next run.
      </p>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Inference</h2>
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
        </div>
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Seed data</h2>
          <p className="text-sm">
            <strong className="tabular-nums">{prospectCount}</strong>{" "}
            prospects seeded from the verified batch-3 research. No
            contact details are stored in this repo.
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Product docs live alongside the repo but are never
            committed. See BRAND.md for the visual identity.
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
