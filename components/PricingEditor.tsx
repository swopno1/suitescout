// S4 pricing editor (client): one row's figures + active toggle.
// Major units in the inputs (dollars/taka), minor units on the wire.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PriceItem } from "@/lib/types";

function major(minor: number | null): string {
  if (minor === null) return "";
  const v = minor / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function parseMajor(raw: string): number | null | "bad" {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return "bad";
  return Math.round(Number(t) * 100);
}

export function PricingRowEditor({ item }: { item: PriceItem }) {
  const router = useRouter();
  const [intl, setIntl] = useState(major(item.intl_monthly_cents));
  const [one, setOne] = useState(major(item.bd_onetime_poisha));
  const [mon, setMon] = useState(major(item.bd_monthly_poisha));
  const [floor, setFloor] = useState(major(item.bd_floor_poisha));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(active?: boolean) {
    setError(null);
    setSaved(false);
    const p = {
      intl_monthly_cents: parseMajor(intl),
      bd_onetime_poisha: parseMajor(one),
      bd_monthly_poisha: parseMajor(mon),
      bd_floor_poisha: parseMajor(floor),
    };
    if (Object.values(p).includes("bad")) {
      setError("Figures are numbers with at most 2 decimals (empty = none).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/pricing/${item.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, ...(active !== undefined ? { active } : {}), note: note.trim() || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSaved(true);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const input = "input w-full tabular-nums";
  return (
    <tr className={item.active ? "" : "opacity-60"}>
      <td className="px-3 py-2">
        <p className="font-semibold">{item.name}</p>
        <p className="text-xs text-stone-500">
          {item.group}
          {item.members ? ` · ${item.members.length} members` : ""}
          {!item.active ? " · deactivated" : ""}
        </p>
      </td>
      <td className="px-2 py-2">
        <input aria-label={`${item.name} intl monthly USD`} value={intl} onChange={(e) => setIntl(e.target.value)} inputMode="decimal" className={input} disabled={!item.editable} />
      </td>
      <td className="px-2 py-2">
        <input aria-label={`${item.name} BD one-time BDT`} value={one} onChange={(e) => setOne(e.target.value)} inputMode="decimal" className={input} disabled={!item.editable} />
      </td>
      <td className="px-2 py-2">
        <input aria-label={`${item.name} BD monthly BDT`} value={mon} onChange={(e) => setMon(e.target.value)} inputMode="decimal" className={input} disabled={!item.editable} />
      </td>
      <td className="px-2 py-2">
        <input aria-label={`${item.name} BD floor BDT`} value={floor} onChange={(e) => setFloor(e.target.value)} inputMode="decimal" className={input} disabled={!item.editable} />
      </td>
      <td className="px-2 py-2">
        {item.editable ? (
          <div className="flex flex-col gap-1">
            <input aria-label="Change note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (audited)" className="input w-full" />
            <div className="flex gap-1">
              <button onClick={() => save()} disabled={busy} className="btn-accent !px-3 !py-1 text-xs">
                {busy ? "…" : "Save"}
              </button>
              <button onClick={() => save(!item.active)} disabled={busy} className="btn-ghost !px-3 !py-1 text-xs">
                {item.active ? "Deactivate" : "Activate"}
              </button>
            </div>
            {saved && <p className="text-xs font-semibold text-green-700">Saved.</p>}
            {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
          </div>
        ) : (
          <p className="text-xs text-stone-500">Locked in Stripe.</p>
        )}
      </td>
    </tr>
  );
}
