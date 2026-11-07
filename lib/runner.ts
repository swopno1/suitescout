// Shared run starter — used by POST /api/runs (single) and
// POST /api/runs/batch. Creates the run with the five agent-loop
// steps in `pending`, then executes the loop in the background
// (Next `after`) so the client can poll GET /api/runs/:id for the
// live trace.
import { after } from "next/server";
import { createRun } from "./db";
import { runAgent } from "./agent";
import { AGENT_STEPS, type Run, type RunStep } from "./types";

export async function startRun(prospectId: number): Promise<Run> {
  const steps: RunStep[] = AGENT_STEPS.map((name) => ({
    name,
    status: "pending",
    started: null,
    finished: null,
    evidence: [],
    output: null,
    note: null,
  }));
  const run = await createRun(prospectId, steps);
  after(async () => {
    try {
      await runAgent(run.id);
    } catch (err) {
      console.error(`runAgent(${run.id}) failed:`, err);
    }
  });
  return run;
}
