// Log out — expires the session cookie, then leaves for /login.
"use client";

import { useState } from "react";

export default function LogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie may already be gone — still leave for /login.
    }
    window.location.href = "/login";
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className={
        className ??
        "rounded-full px-3.5 py-1.5 text-sm font-semibold text-stone-500 transition-colors hover:bg-accent-light hover:text-accent disabled:opacity-50"
      }
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
