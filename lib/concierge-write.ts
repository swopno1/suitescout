// S3 governed writes to the Concierge database. The ONLY module that
// opens the superadmin_rw pool, and the ONLY writer of admin_actions
// rows: no admin write exists without its audit row. Every action:
// read before (read role) → UPDATE (write role) → audit insert
// (SuiteScout DB). The two stores can't share a transaction, so if
// the audit insert fails the Concierge change is REVERTED and the
// action reports failure — a write without a row never stands.
import { Pool } from "pg";
import { getPropertyGateState } from "./concierge-db";
import { recordAdminAction } from "./db";
import {
  ActionError,
  requireReason,
  validateManualApproval,
  type ManualApprovalInput,
} from "./admin-action-validation";

export { ActionError };
export type { ManualApprovalInput };

let writePool: Pool | null = null;
let writePoolForUrl: string | null = null;

function getWritePool(url: string): Pool {
  if (writePool && writePoolForUrl === url) return writePool;
  if (writePool) void writePool.end().catch(() => {});
  const next = new Pool({
    connectionString: url,
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  next.on("error", () => {});
  writePool = next;
  writePoolForUrl = url;
  return next;
}

/** Test seam only. */
export async function closeConciergeWritePool(): Promise<void> {
  if (writePool) await writePool.end().catch(() => {});
  writePool = null;
  writePoolForUrl = null;
}

function requireWriteUrl(): string {
  const url = process.env.CONCIERGE_WRITE_DATABASE_URL?.trim();
  if (!url) {
    throw new ActionError(
      503,
      "Concierge write link not configured — set CONCIERGE_WRITE_DATABASE_URL on the server.",
    );
  }
  return url;
}

type GateState = {
  adminHold: boolean;
  manualPlan: string | null;
  manualPeriodEnd: string | null;
};

async function readBefore(propertyId: string): Promise<GateState> {
  const res = await getPropertyGateState(propertyId);
  if (res.status === "unconfigured") {
    throw new ActionError(
      503,
      "Concierge link not configured — set CONCIERGE_DATABASE_URL on the server.",
    );
  }
  if (res.status === "unreachable") {
    throw new ActionError(503, "Concierge database did not answer — try again.");
  }
  if (!res.data) {
    throw new ActionError(404, "No such property in the Concierge database.");
  }
  return res.data;
}

/** Suspend (hold=true) or reactivate (hold=false) a property. */
export async function applyAdminHold(input: {
  propertyId: string;
  hold: boolean;
  reason: unknown;
  actor: string;
}): Promise<{ before: GateState; after: GateState }> {
  const reason = requireReason(input.reason);
  const before = await readBefore(input.propertyId);
  if (before.adminHold === input.hold) {
    throw new ActionError(
      409,
      input.hold
        ? "That property is already on hold."
        : "That property is not on hold.",
    );
  }
  const after: GateState = { ...before, adminHold: input.hold };
  const db = getWritePool(requireWriteUrl());
  const updated = await db
    .query(`UPDATE "Property" SET "adminHold" = $1 WHERE id = $2`, [
      input.hold,
      input.propertyId,
    ])
    .catch((e: unknown) => {
      throw new ActionError(
        503,
        `Concierge write failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    });
  if ((updated.rowCount ?? 0) === 0) {
    throw new ActionError(404, "No such property in the Concierge database.");
  }
  try {
    await recordAdminAction({
      actor: input.actor,
      action: input.hold ? "property.suspend" : "property.reactivate",
      targetType: "concierge-property",
      targetId: input.propertyId,
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      reason,
    });
  } catch (e) {
    // The audit row is the spine: without it the change must not stand.
    await db
      .query(`UPDATE "Property" SET "adminHold" = $1 WHERE id = $2`, [
        before.adminHold,
        input.propertyId,
      ])
      .catch(() => {});
    throw new ActionError(
      503,
      `Audit write failed, change reverted: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return { before, after };
}

/** Approve (or renew) a manual subscription: plan + paid-through date.
 *  The reference evidences payment (free text until S5 invoices). */
export async function applyManualApproval(input: {
  propertyId: string;
  approval: ManualApprovalInput;
  actor: string;
  now?: Date;
}): Promise<{ before: GateState; after: GateState }> {
  const valid = validateManualApproval(input.approval, input.now ?? new Date());
  const before = await readBefore(input.propertyId);
  const after: GateState = {
    ...before,
    manualPlan: valid.plan,
    manualPeriodEnd: valid.periodEndIso,
  };
  const db = getWritePool(requireWriteUrl());
  const updated = await db
    .query(
      `UPDATE "Property" SET "manualPlan" = $1, "manualPeriodEnd" = $2 WHERE id = $3`,
      [valid.plan, valid.periodEndIso, input.propertyId],
    )
    .catch((e: unknown) => {
      throw new ActionError(
        503,
        `Concierge write failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    });
  if ((updated.rowCount ?? 0) === 0) {
    throw new ActionError(404, "No such property in the Concierge database.");
  }
  try {
    await recordAdminAction({
      actor: input.actor,
      action: "property.manual-approval",
      targetType: "concierge-property",
      targetId: input.propertyId,
      before: {
        ...(before as unknown as Record<string, unknown>),
      },
      after: {
        ...(after as unknown as Record<string, unknown>),
        reference: valid.reference,
      },
      reason: valid.reason,
    });
  } catch (e) {
    await db
      .query(
        `UPDATE "Property" SET "manualPlan" = $1, "manualPeriodEnd" = $2 WHERE id = $3`,
        [before.manualPlan, before.manualPeriodEnd, input.propertyId],
      )
      .catch(() => {});
    throw new ActionError(
      503,
      `Audit write failed, change reverted: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return { before, after };
}
