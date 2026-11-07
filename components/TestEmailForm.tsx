// Owner deliverability check — one test email proving the Resend
// key and verified domain before real outreach goes out.
"use client";

import { useState } from "react";

export default function TestEmailForm({ enabled }: { enabled: boolean }) {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    if (!to.trim()) {
      setError("Enter an address to test.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test send failed");
      setResult(`Test email sent to ${to.trim()} — check the inbox.`);
      setTo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test send failed");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <p className="text-sm text-stone-600">
        Add RESEND_API_KEY on the server to send email.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-52 flex-1">
          <span className="label mb-1 block">Test address</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="input w-full"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-accent">
          {busy ? "Sending…" : "Send test"}
        </button>
      </div>
      {result && (
        <p role="status" className="mt-2 text-sm font-semibold text-brand-dark">
          {result}
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
