// S3 action validation — pure leaf module (no imports), so node
// test scripts AND client components can use it without dragging
// in pg or the database layer.
export const MANUAL_PLANS = ["STARTER", "GROWTH", "SCALE"] as const;
export type ManualPlan = (typeof MANUAL_PLANS)[number];

export class ActionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ActionError";
    this.status = status;
  }
}

export function requireReason(reason: unknown): string {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new ActionError(400, "A reason is required — it goes in the audit row.");
  }
  return reason.trim();
}

export interface ManualApprovalInput {
  plan: unknown;
  periodEnd: unknown;
  reference: unknown;
  reason: unknown;
}

export interface ValidManualApproval {
  plan: ManualPlan;
  periodEndIso: string;
  reference: string;
  reason: string;
}

/** Pure validation (unit-tested): plan allowlist, live period end,
 *  non-empty payment reference + reason. */
export function validateManualApproval(
  input: ManualApprovalInput,
  now: Date,
): ValidManualApproval {
  if (
    typeof input.plan !== "string" ||
    !(MANUAL_PLANS as readonly string[]).includes(input.plan)
  ) {
    throw new ActionError(
      400,
      `Plan must be one of ${MANUAL_PLANS.join(", ")}.`,
    );
  }
  if (typeof input.periodEnd !== "string") {
    throw new ActionError(400, "Period end must be a date (YYYY-MM-DD).");
  }
  const end = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(input.periodEnd.trim())
      ? `${input.periodEnd.trim()}T23:59:59Z`
      : input.periodEnd.trim(),
  );
  if (!Number.isFinite(end.getTime())) {
    throw new ActionError(400, "Period end must be a date (YYYY-MM-DD).");
  }
  if (end.getTime() <= now.getTime()) {
    throw new ActionError(
      400,
      "Period end must be in the future — an approval starts a live period.",
    );
  }
  if (typeof input.reference !== "string" || input.reference.trim().length === 0) {
    throw new ActionError(
      400,
      "A payment reference is required (invoice id once S5 exists).",
    );
  }
  return {
    plan: input.plan as ManualPlan,
    periodEndIso: end.toISOString(),
    reference: input.reference.trim(),
    reason: requireReason(input.reason),
  };
}
