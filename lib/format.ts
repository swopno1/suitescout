// Timestamp presentation — pure. Absolute time in Asia/Dhaka plus a
// short relative age, so "2026-11-07T15:32:00.000Z" reads as
// "7 Nov, 21:32 · 2h ago".
const dhakaFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function relativeAge(iso: string, nowMs?: number): string {
  const diffMs = (nowMs ?? Date.now()) - Date.parse(iso);
  if (!Number.isFinite(diffMs)) return "";
  if (diffMs < 0) return "upcoming";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatWhen(iso: string, nowMs?: number): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return `${dhakaFmt.format(new Date(ms))} · ${relativeAge(iso, nowMs)}`;
}

// S4 money: minor units in, display string out. USD cents → $49;
// BDT poisha → ৳24,999 (whole-taka figures show no decimals).
export function formatMoney(
  minor: number | null,
  currency: "USD" | "BDT",
): string {
  if (minor === null) return "—";
  if (currency === "USD") {
    const dollars = minor / 100;
    return Number.isInteger(dollars)
      ? `$${dollars.toLocaleString("en-US")}`
      : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const taka = minor / 100;
  return Number.isInteger(taka)
    ? `৳${taka.toLocaleString("en-US")}`
    : `৳${taka.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
