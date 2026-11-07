// Lead evaluation — pure rules. Given a snapshot of a prospect's
// pipeline position, decide a verdict + the one suggested action. The
// API route may add an LLM-worded summary on top; the verdict itself
// is always these rules, so keyless behavior is identical.
import type { ProspectStatus } from "./types";

export type LeadVerdict = "on-track" | "needs-nudge" | "stalled" | "closed";

export interface LeadSnapshot {
  status: ProspectStatus;
  /** ISO of the last stage change (or created_at when untouched). */
  lastStatusAt: string;
  created_at: string;
  fit_score: number | null;
  score_band: "hot" | "warm" | "cold" | null;
  runs: { status: string; started_at: string; finished_at: string | null }[];
  drafts: {
    channel: string;
    status: string;
    created_at: string;
    approved_at: string | null;
    sent_at: string | null;
  }[];
  /** Computed due dates (ISO) for pending follow-ups. */
  followupDues: { dueAt: string; status: string }[];
  /** Contact values on file (absent for runs predating capture). */
  contactCount?: number;
}

export interface Evaluation {
  verdict: LeadVerdict;
  reasons: string[];
  suggested_action: string;
}

const DAY = 24 * 60 * 60 * 1000;

export function evaluateLead(snap: LeadSnapshot, nowMs?: number): Evaluation {
  const now = nowMs ?? Date.now();
  const ageDays = (now - Date.parse(snap.lastStatusAt)) / DAY;
  const reasons: string[] = [];
  let verdict: LeadVerdict = "on-track";
  let suggested_action = "Keep working this lead.";

  const escalate = (v: LeadVerdict) => {
    const rank: Record<LeadVerdict, number> = {
      "on-track": 0,
      "needs-nudge": 1,
      stalled: 2,
      closed: 0,
    };
    if (rank[v] > rank[verdict]) verdict = v;
  };

  if (snap.status === "closed") {
    return {
      verdict: "closed",
      reasons: ["Lead is closed."],
      suggested_action: "No action needed.",
    };
  }

  const runsDone = snap.runs.filter((r) => r.status === "done").length;
  const runsFailed = snap.runs.filter((r) => r.status === "failed").length;
  const approved = snap.drafts.filter((d) => d.status === "approved");
  const sent = snap.drafts.filter((d) => d.status === "sent");
  const overdue = snap.followupDues.filter(
    (f) => f.status === "pending" && Date.parse(f.dueAt) < now,
  );

  if (snap.status === "new" && snap.runs.length === 0) {
    reasons.push("Fresh lead, never run.");
    suggested_action =
      snap.score_band === "hot" || ageDays > 3
        ? "Run the agent now — this one should not wait."
        : "Run the agent to research and score it.";
    if (ageDays > 3) escalate("needs-nudge");
    return { verdict, reasons, suggested_action };
  }
  if (snap.runs.length > 0 && runsDone === 0) {
    reasons.push(`${runsFailed} run(s) failed, none completed.`);
    suggested_action = "Retry the failed run from the run view.";
    escalate("needs-nudge");
    return { verdict, reasons, suggested_action };
  }
  if (runsDone > 0 && snap.drafts.length === 0) {
    reasons.push("Researched but no drafts were produced.");
    suggested_action = "Re-run the agent — the draft step produced nothing.";
    escalate("stalled");
    return { verdict, reasons, suggested_action };
  }
  if (sent.length > 0 && ["new", "researched", "drafted"].includes(snap.status)) {
    reasons.push(`${sent.length} draft(s) sent but the lead still shows ${snap.status}.`);
    suggested_action = "Move the lead to Contacted to reflect reality.";
    escalate("needs-nudge");
  }
  if (
    approved.length > 0 &&
    sent.length === 0 &&
    ["researched", "drafted"].includes(snap.status)
  ) {
    const ch = approved[0].channel;
    reasons.push(`${approved.length} approved draft(s) waiting to send.`);
    suggested_action = `Send the approved ${ch} draft, then move to Contacted.`;
    escalate(ageDays > 2 ? "needs-nudge" : "on-track");
  }
  if (
    snap.drafts.length > 0 &&
    approved.length === 0 &&
    sent.length === 0 &&
    ["researched", "drafted"].includes(snap.status)
  ) {
    reasons.push(`${snap.drafts.length} draft(s) awaiting review.`);
    suggested_action = "Review and approve a draft.";
    if (ageDays > 2) escalate("needs-nudge");
  }
  if (
    runsDone > 0 &&
    (snap.contactCount ?? 1) === 0 &&
    ["researched", "drafted"].includes(snap.status)
  ) {
    reasons.push("No email, phone, or WhatsApp on file to send to.");
    suggested_action =
      "Re-run to capture contacts, or pull one from their Facebook page — then send.";
    escalate("needs-nudge");
  }
  if (overdue.length > 0) {
    reasons.push(`${overdue.length} follow-up(s) overdue.`);
    suggested_action = "Send the follow-up now.";
    escalate(ageDays > 7 ? "stalled" : "needs-nudge");
  }
  if (snap.status === "contacted" && ageDays > 14) {
    reasons.push("Contacted 14+ days ago with no reply recorded.");
    suggested_action = "Send a final nudge, or close the lead.";
    escalate("stalled");
  }
  if (
    snap.score_band === "cold" &&
    runsDone >= 2 &&
    snap.status !== "replied"
  ) {
    reasons.push("Cold across 2+ runs with no progress.");
    suggested_action = "Park this lead or close it; spend runs on warmer leads.";
    escalate("stalled");
  }
  if (snap.status === "replied") {
    reasons.push("The resort replied — this is the hottest moment.");
    suggested_action = "Book the Suite demo call now.";
  }
  if (reasons.length === 0) {
    reasons.push(
      `Stage ${snap.status}, ${snap.drafts.length} draft(s), ${snap.followupDues.length} follow-up(s) scheduled.`,
    );
    suggested_action =
      snap.status === "contacted"
        ? "Wait for the reply; the follow-up is scheduled."
        : "Keep working this lead.";
  }
  return { verdict, reasons, suggested_action };
}
