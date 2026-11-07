import { NextResponse } from "next/server";
import {
  getProspect,
  listDraftsForProspect,
  listFollowupsForProspect,
  listRunsForProspect,
  listStatusEvents,
} from "@/lib/db";
import { businessDaysOut } from "@/lib/agent";
import { evaluateLead } from "@/lib/evaluate";
import { chatCompletion, isInferenceConfigured } from "@/lib/inference";

export const dynamic = "force-dynamic";

/** Evaluate a lead's pipeline position. The verdict is pure rules
 *  (evaluateLead); when the inference key is configured, the LLM adds
 *  a one-paragraph summary on top. Keyless behavior is identical
 *  minus the paragraph. */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const prospectId = Number(id);
  if (!Number.isFinite(prospectId)) {
    return NextResponse.json(
      { error: "invalid prospect id" },
      { status: 400 },
    );
  }
  const prospect = await getProspect(prospectId);
  if (!prospect) {
    return NextResponse.json(
      { error: "prospect not found" },
      { status: 404 },
    );
  }
  const [events, drafts, followups, runs] = await Promise.all([
    listStatusEvents(prospectId),
    listDraftsForProspect(prospectId),
    listFollowupsForProspect(prospectId),
    listRunsForProspect(prospectId),
  ]);
  const lastStatusAt =
    events.length > 0
      ? events[events.length - 1].created_at
      : prospect.created_at;
  const evaluation = evaluateLead({
    status: prospect.status,
    lastStatusAt,
    created_at: prospect.created_at,
    fit_score: prospect.fit_score,
    score_band: prospect.score_band,
    runs: runs.map((r) => ({
      status: r.status,
      started_at: r.started_at,
      finished_at: r.finished_at,
    })),
    drafts: drafts.map((d) => ({
      channel: d.channel,
      status: d.status,
      created_at: d.created_at,
      approved_at: d.approved_at,
      sent_at: d.sent_at,
    })),
    followupDues: followups.map((f) => ({
      dueAt: businessDaysOut(f.due_after_days, Date.parse(f.created_at)),
      status: f.status,
    })),
  });

  let summary: string | null = null;
  if (isInferenceConfigured()) {
    try {
      summary = await chatCompletion({
        messages: [
          {
            role: "system",
            content:
              "You brief a founder on one sales lead in 2–3 sentences. Use ONLY the facts given. Never invent prices, names, or events.",
          },
          {
            role: "user",
            content: [
              `Lead: ${prospect.name} (${prospect.location ?? "unknown location"}), score ${prospect.fit_score ?? "unscored"} ${prospect.score_band ?? ""}, stage ${prospect.status}.`,
              `Verdict: ${evaluation.verdict}. Reasons: ${evaluation.reasons.join(" ")}`,
              `Suggested action: ${evaluation.suggested_action}`,
              `Summarize the position and the action briefly.`,
            ].join("\n"),
          },
        ],
        temperature: 0.3,
        maxTokens: 200,
      });
    } catch {
      summary = null;
    }
  }
  return NextResponse.json({ evaluation, summary });
}
