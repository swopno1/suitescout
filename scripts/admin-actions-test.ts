// S2+S3 logic test — status derivation (console mirror of the
// Concierge gate) + manual-approval validation. Pure functions, no
// database. Run: `node scripts/admin-actions-test.ts` (Node 24 runs
// .ts directly). Exit code 1 on any failure.
import {
  deriveCustomerState,
  type StatusInputs,
} from "../lib/concierge-db.ts";
import {
  ActionError,
  validateManualApproval,
} from "../lib/admin-action-validation.ts";

const D = 86_400_000;
const now = new Date("2026-11-14T12:00:00Z");

let failures = 0;

function check(name: string, cond: boolean): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) failures++;
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function inputs(over: Partial<StatusInputs>): StatusInputs {
  return {
    sub: {
      tier: "GROWTH",
      status: "TRIAL",
      trialEndsAt: new Date(now.getTime() + 10 * D).toISOString(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      overageAgreed: false,
    },
    adminHold: false,
    manualPlan: null,
    manualPeriodEnd: null,
    usageThisMonth: 0,
    now,
    ...over,
  };
}

// ---- status derivation (must match Concierge gateDecision order) ----

check(
  "hold wins over everything",
  eq(deriveCustomerState(inputs({ adminHold: true })), {
    state: "paused-by-vivereply",
  }) &&
    eq(
      deriveCustomerState(
        inputs({
          adminHold: true,
          sub: null,
          manualPlan: "SCALE",
          manualPeriodEnd: new Date(now.getTime() + D).toISOString(),
        }),
      ),
      { state: "paused-by-vivereply" },
    ),
);

check(
  "live manual serves over an expired trial",
  eq(
    deriveCustomerState(
      inputs({
        sub: {
          tier: "GROWTH",
          status: "TRIAL",
          trialEndsAt: new Date(now.getTime() - D).toISOString(),
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          overageAgreed: false,
        },
        manualPlan: "STARTER",
        manualPeriodEnd: new Date(now.getTime() + D).toISOString(),
      }),
    ),
    { state: "active", manual: true },
  ),
);

check(
  "manual quota stops unconditionally at 120%",
  eq(
    deriveCustomerState(
      inputs({
        manualPlan: "STARTER",
        manualPeriodEnd: new Date(now.getTime() + D).toISOString(),
        usageThisMonth: 599,
      }),
    ),
    { state: "active", manual: true },
  ) &&
    eq(
      deriveCustomerState(
        inputs({
          manualPlan: "STARTER",
          manualPeriodEnd: new Date(now.getTime() + D).toISOString(),
          usageThisMonth: 600,
        }),
      ),
      { state: "paused-quota" },
    ),
);

check(
  "expired manual falls through to the subscription machine",
  eq(
    deriveCustomerState(
      inputs({
        manualPlan: "GROWTH",
        manualPeriodEnd: new Date(now.getTime() - 1).toISOString(),
      }),
    ),
    { state: "trial", daysLeft: 10 },
  ),
);

check(
  "trial states: live, quota, ended",
  eq(deriveCustomerState(inputs({})), { state: "trial", daysLeft: 10 }) &&
    eq(deriveCustomerState(inputs({ usageThisMonth: 2400 })), {
      state: "paused-quota",
    }) &&
    eq(
      deriveCustomerState(
        inputs({
          sub: {
            tier: "GROWTH",
            status: "TRIAL",
            trialEndsAt: new Date(now.getTime() - 1).toISOString(),
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            overageAgreed: false,
          },
        }),
      ),
      { state: "trial-ended" },
    ),
);

check(
  "stripe states: active, overage, past-due, canceled, expired, unknown",
  eq(
    deriveCustomerState(
      inputs({
        sub: {
          tier: "STARTER",
          status: "ACTIVE",
          trialEndsAt: new Date(now.getTime() - 40 * D).toISOString(),
          currentPeriodEnd: new Date(now.getTime() + D).toISOString(),
          cancelAtPeriodEnd: false,
          overageAgreed: false,
        },
        usageThisMonth: 100,
      }),
    ),
    { state: "active", manual: false },
  ) &&
    eq(
      deriveCustomerState(
        inputs({
          sub: {
            tier: "STARTER",
            status: "ACTIVE",
            trialEndsAt: new Date(now.getTime() - 40 * D).toISOString(),
            currentPeriodEnd: new Date(now.getTime() + D).toISOString(),
            cancelAtPeriodEnd: false,
            overageAgreed: true,
          },
          usageThisMonth: 6000,
        }),
      ),
      { state: "active", manual: false },
    ) &&
    eq(
      deriveCustomerState(
        inputs({
          sub: {
            tier: "GROWTH",
            status: "PAST_DUE",
            trialEndsAt: new Date(now.getTime() - 40 * D).toISOString(),
            currentPeriodEnd: new Date(now.getTime() + D).toISOString(),
            cancelAtPeriodEnd: false,
            overageAgreed: false,
          },
        }),
      ),
      { state: "past-due" },
    ) &&
    eq(
      deriveCustomerState(
        inputs({
          sub: {
            tier: "GROWTH",
            status: "CANCELED",
            trialEndsAt: new Date(now.getTime() - 40 * D).toISOString(),
            currentPeriodEnd: new Date(now.getTime() + D).toISOString(),
            cancelAtPeriodEnd: true,
            overageAgreed: false,
          },
        }),
      ),
      { state: "active", manual: false },
    ) &&
    eq(
      deriveCustomerState(
        inputs({
          sub: {
            tier: "GROWTH",
            status: "EXPIRED",
            trialEndsAt: new Date(now.getTime() - 40 * D).toISOString(),
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            overageAgreed: false,
          },
        }),
      ),
      { state: "ended" },
    ) &&
    eq(
      deriveCustomerState(
        inputs({
          sub: {
            tier: "GROWTH",
            status: "LIMBO",
            trialEndsAt: new Date(now.getTime() - 40 * D).toISOString(),
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            overageAgreed: false,
          },
        }),
      ),
      { state: "unknown" },
    ) &&
    eq(deriveCustomerState(inputs({ sub: null })), { state: "none" }),
);

// ---- manual-approval validation ----

function expectThrow(
  name: string,
  fn: () => void,
  status: number,
  match: RegExp,
): void {
  try {
    fn();
    check(name, false);
  } catch (e) {
    check(
      name,
      e instanceof ActionError && e.status === status && match.test(e.message),
    );
  }
}

const good = {
  plan: "GROWTH",
  periodEnd: "2026-12-14",
  reference: "bKash TrxID ABC123",
  reason: "Annual BD deal",
};

check(
  "valid approval passes (date = end of that day UTC)",
  eq(validateManualApproval(good, now), {
    plan: "GROWTH",
    periodEndIso: "2026-12-14T23:59:59.000Z",
    reference: "bKash TrxID ABC123",
    reason: "Annual BD deal",
  }),
);

expectThrow(
  "unknown plan rejected",
  () => validateManualApproval({ ...good, plan: "PLATINUM" }, now),
  400,
  /STARTER/,
);
expectThrow(
  "past period end rejected",
  () => validateManualApproval({ ...good, periodEnd: "2026-11-01" }, now),
  400,
  /future/,
);
expectThrow(
  "garbage date rejected",
  () => validateManualApproval({ ...good, periodEnd: "not-a-date" }, now),
  400,
  /date/,
);
expectThrow(
  "missing reference rejected",
  () => validateManualApproval({ ...good, reference: "  " }, now),
  400,
  /reference/,
);
expectThrow(
  "missing reason rejected",
  () => validateManualApproval({ ...good, reason: "" }, now),
  400,
  /reason/,
);

if (failures > 0) {
  console.error(`${failures} admin-actions check(s) failed.`);
  process.exit(1);
}
console.log("admin-actions: all checks passed.");
