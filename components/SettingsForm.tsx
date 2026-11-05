"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsForm({
  currentModel,
  currentDelay,
  models,
}: {
  currentModel: string;
  currentDelay: number;
  models: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [model, setModel] = useState(currentModel);
  const [delay, setDelay] = useState(currentDelay);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inference_model: model,
          followup_delay_days: delay,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-stone-300 bg-white p-4"
    >
      <label className="mb-4 block text-sm font-semibold">
        Inference model
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mt-1 block w-full rounded border border-stone-300 px-2 py-2 text-sm font-normal"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} ({m.id})
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-stone-500">
          Vultr Serverless Inference, OpenAI-compatible. Friday&apos;s agent
          executor uses this model.
        </span>
      </label>
      <label className="mb-4 block text-sm font-semibold">
        Follow-up delay (days)
        <input
          type="number"
          min={1}
          max={30}
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))}
          className="mt-1 block w-32 rounded border border-stone-300 px-2 py-2 text-sm font-normal"
        />
        <span className="mt-1 block text-xs font-normal text-stone-500">
          Draft the follow-up this many days after the first touch (default
          3).
        </span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save settings"}
      </button>
      {saved && (
        <span className="ml-3 text-sm text-brand">Saved.</span>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}
