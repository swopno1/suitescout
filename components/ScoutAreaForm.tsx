// Scout this area — place name in, live scout out. The server queues
// the scout and works it in the background; this form hands off to
// the /scout view, where progress and findings land live.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ScoutAreaForm() {
  const router = useRouter();
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      const id = (data.scout as { id?: unknown } | undefined)?.id;
      if (typeof id !== "number") throw new Error("Area scout failed");
      router.push(`/scout?id=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Area scout failed");
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
        and imports the rest as New leads — watch it land live on the
        Scout view.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
