// Inference connection check: one timed call, honest result.
"use client";

import { useState } from "react";

type Result = {
  ok: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
};

export default function TestConnectionButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function test() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/settings/test", { method: "POST" });
      setResult(await res.json());
    } catch (err) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : "request failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={test} disabled={busy} className="btn-accent">
        {busy ? "Testing…" : "Test connection"}
      </button>
      {result && (
        <p
          role="status"
          className={`mt-2 text-sm font-semibold ${
            result.ok ? "text-brand-dark" : "text-red-700"
          }`}
        >
          {result.ok
            ? `Connected to ${result.model ?? "model"} in ${result.latencyMs ?? "?"} ms.`
            : `Not connected: ${result.error ?? "unknown error"}`}
        </p>
      )}
    </div>
  );
}
