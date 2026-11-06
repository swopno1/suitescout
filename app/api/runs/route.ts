import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createRun, getProspect } from "@/lib/db";
import { runAgent } from "@/lib/agent";
import { AGENT_STEPS, type RunStep } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Start an agent run. Creates the run with the five agent-loop steps
 * in `pending`, then executes the loop in the background (Next `after`)
 * so the client can poll GET /api/runs/:id for the live trace.
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
  const steps: RunStep[] = AGENT_STEPS.map((name) => ({
    name,
    status: "pending",
    started: null,
    finished: null,
    evidence: [],
    output: null,
    note: null,
  }));
  const run = createRun(prospectId, steps);
  after(async () => {
    try {
      await runAgent(run.id);
    } catch (err) {
      console.error(`runAgent(${run.id}) failed:`, err);
    }
  });
  return NextResponse.json({ run }, { status: 201 });
}
