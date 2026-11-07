// Scout this area — place name in, deduped prospects out. The server
// geocodes, queries Overpass, junk-filters, and dedupes; this form
// reports the honest counts and refreshes the board.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ScoutResult {
  display_name: string;
  found: number;
  junk_skipped: number;
  dupes_skipped: number;
  imported: number;
}

export default function ScoutAreaForm() {
  const router = useRouter();
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (place.trim().length < 2) {
      setError("Name a town or city to scout.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: place.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Area scout failed");
      setResult(data);
      setPlace("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Area scout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-52 flex-1 flex-col text-xs font-semibold">
          Scout this area
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Cox's Bazar"
            className="input mt-1"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-accent">
          {busy ? "Scouting…" : "Scout area"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-stone-500">
        Finds lodging from the public map, skips junk and duplicates,
        and imports the rest as New leads — then run the agent on them.
      </p>
      {result && (
        <p role="status" className="mt-2 text-sm font-semibold text-brand-dark">
          {result.imported} lead{result.imported === 1 ? "" : "s"} imported
          from {result.display_name.split(",")[0]} ({result.found} found
          {result.junk_skipped > 0 &&
            ` · ${result.junk_skipped} junk skipped`}
          {result.dupes_skipped > 0 &&
            ` · ${result.dupes_skipped} already on the board`}
          ).
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
