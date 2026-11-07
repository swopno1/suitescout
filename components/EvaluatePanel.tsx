// Evaluate-position panel: fetches the rules verdict (+ optional LLM
// summary) for a prospect and renders it. One click, one fetch.
"use client";

import { useState } from "react";
import type { Evaluation } from "@/lib/evaluate";

const VERDICT_STYLES: Record<Evaluation["verdict"], string> = {
  "on-track": "bg-brand text-white",
  "needs-nudge": "bg-amber-600 text-white",
  stalled: "bg-red-700 text-white",
  closed: "bg-stone-500 text-white",
};

export default function EvaluatePanel({
  prospectId,
}: {
  prospectId: number;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    evaluation: Evaluation;
    summary: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function evaluate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/evaluate`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to evaluate");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={evaluate}
        disabled={busy}
        className="btn-accent shrink-0"
      >
        {busy ? "Evaluating…" : result ? "Re-evaluate" : "Evaluate position"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg bg-stone-100/80 p-3">
          <p className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${VERDICT_STYLES[result.evaluation.verdict]}`}
            >
              {result.evaluation.verdict}
            </span>
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.evaluation.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-stone-500"
                />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <strong>Suggested next step:</strong>{" "}
            {result.evaluation.suggested_action}
          </p>
          {result.summary && (
            <p className="mt-2 border-t border-stone-200 pt-2 text-sm text-stone-600">
              {result.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
