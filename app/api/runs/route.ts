import { NextRequest, NextResponse } from "next/server";
import { createRun, getProspect } from "@/lib/db";
import { AGENT_STEPS, type RunStep } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Scaffold stub — creates the run record with the five agent-loop steps
 * in `pending` and status `queued`. The agent executor lands Friday;
 * nothing here fetches, scores, or drafts anything. A queued run is an
 * honest placeholder, not a working agent.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const prospectId = (body as { prospect_id?: unknown } | null)?.prospect_id;
  if (typeof prospectId !== "number" || !Number.isFinite(prospectId)) {
    return NextResponse.json(
      { error: "prospect_id (number) is required" },
      { status: 400 },
    );
  }
  const prospect = getProspect(prospectId);
  if (!prospect) {
    return NextResponse.json({ error: "prospect not found" }, { status: 404 });
  }
  const steps: RunStep[] = AGENT_STEPS.map((name, i) => ({
    name,
    status: "pending",
    started: null,
    finished: null,
    evidence: [],
    output: null,
    note:
      i === 0
        ? "TODO: agent execution lands Friday — this run is queued; no agent has run yet."
        : null,
  }));
  const run = createRun(prospectId, steps);
  return NextResponse.json(
    {
      run,
      note: "Scaffold stub: run queued. Agent execution lands Friday.",
    },
    { status: 201 },
  );
}
