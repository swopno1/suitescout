import { NextResponse } from "next/server";
import { hasActiveRun, listProspects } from "@/lib/db";
import { startRun } from "@/lib/runner";

export const dynamic = "force-dynamic";

/**
 * Start agent runs for every prospect still in "new". One run per
 * prospect, using the same creation + `after()` execution path as
 * POST /api/runs. A prospect is skipped when it already has a queued
 * or running run, so a second batch call never duplicates live runs.
 * Prospects already researched / drafted / contacted / replied are
 * untouched.
 */
export async function POST() {
  const fresh = await listProspects({ status: "new" });
  // Cap: a batch never fires more than this many runs at once —
  // outbound hosts, the DB, and inference spend stay bounded. The
  // remainder waits for the next batch press.
  const BATCH_CAP = 25;
  const batch = fresh.slice(0, BATCH_CAP);
  const runIds: number[] = [];
  let skipped = 0;
  for (const prospect of batch) {
    if (await hasActiveRun(prospect.id)) {
      skipped += 1;
      continue;
    }
    const run = await startRun(prospect.id);
    runIds.push(run.id);
  }
  return NextResponse.json(
    {
      created: runIds.length,
      run_ids: runIds,
      skipped,
      capped: fresh.length > BATCH_CAP,
      total_new: fresh.length,
    },
    { status: 201 },
  );
}
