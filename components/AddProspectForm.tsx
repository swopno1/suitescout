"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddProspectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add prospect");
      setName("");
      setWebsite("");
      setLocation("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add prospect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-6 flex flex-wrap items-end gap-2">
      <label className="flex min-w-44 flex-1 flex-col text-xs font-semibold">
        Resort name *
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Coral Bay Resort"
          className="input mt-1"
        />
      </label>
      <label className="flex min-w-44 flex-1 flex-col text-xs font-semibold">
        Website
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          className="input mt-1"
        />
      </label>
      <label className="flex min-w-40 flex-1 flex-col text-xs font-semibold">
        Location
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Cox's Bazar"
          className="input mt-1"
        />
      </label>
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Adding…" : "Add prospect"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
