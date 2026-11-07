// Business-day dates — pure. Bangladesh week: Friday + Saturday are
// the weekend, so follow-up due dates step in UTC and skip day 5/6.
// Day granularity keeps it deterministic on any server timezone.
export function businessDaysOut(days: number, fromMs?: number): string {
  const d = fromMs !== undefined ? new Date(fromMs) : new Date();
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 5 && day !== 6) added += 1;
  }
  return d.toISOString().slice(0, 10);
}
