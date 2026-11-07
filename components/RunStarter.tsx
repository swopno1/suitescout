// Start a single-prospect run from the /run page: pick + fire.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RunStarter({
  prospects,
}: {
  prospects: { id: number; name: string; status: string }[];
}) {
  const router = useRouter();
  const [prospectId, setProspectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!prospectId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: Number(prospectId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start run");
      router.push(`/run?id=${data.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-52 flex-1">
          <span className="label mb-1 block">Prospect</span>
          <select
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            className="input"
          >
            <option value="">Choose a prospect…</option>
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status})
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={start}
          disabled={busy || !prospectId}
          className="btn-primary"
        >
          {busy ? "Starting…" : "Run"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
