// Login form — username + password against the env-driven admin
// identity (APP_USER / APP_PASSWORD). On success the server sets
// the session cookie; a hard navigation carries it to the destination.
"use client";

import { useState } from "react";

export default function LoginForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter the username and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <p role="alert" className="text-sm font-semibold text-red-700">
        Server login is not configured — set APP_USER and APP_PASSWORD
        on the server.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="label mb-1 block" htmlFor="login-username">
        Username
      </label>
      <input
        id="login-username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoFocus
        className="input mb-3 w-full"
      />
      <label className="label mb-1 block" htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        className="input mb-3 w-full"
      />
      <button type="submit" disabled={busy} className="btn-accent w-full">
        {busy ? "Logging in…" : "Log in"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
