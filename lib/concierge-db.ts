// Read-only link to the Concierge database (S1 foundation, S2 reads).
// This app NEVER writes to Concierge through this module: the
// connection string must use the superadmin_ro role (SELECT-only
// grants), and every session is opened read-only as a second layer.
// Fail-soft by design — unset or unreachable just means the Customers
// section says so; the sales tool never depends on this link.
// Writes live in lib/concierge-write.ts (superadmin_rw, actions only).
import { Pool } from "pg";

// Table/column names mirror the Concierge Prisma schema (no @@map, so
// quoted PascalCase): "User", "Property", "Subscription",
// "Conversation", "PropertyBinding", "ApprovedDomain". Keep these
// queries in sync with that schema.

export interface TrialEnding {
  propertyName: string;
  trialEndsAt: string;
}

export interface ConciergeSnapshot {
  ownersActive: number;
  ownersTotal: number;
  propertiesActive: number;
  propertiesTotal: number;
  /** Subscription rows grouped by tier (GROWTH / SCALE / ...). */
  planMix: { tier: string; count: number }[];
  /** TRIAL subscriptions ending within 7 days (past-due included). */
  trialsEnding: TrialEnding[];
  /** Conversations opened since the start of the UTC month. */
  conversationsThisMonth: number;
  /** ACTIVE/PAST_DUE rows with a real Stripe subscription, by interval. */
  stripeActive: { interval: string; count: number }[];
  /** Properties on a live manual (offline/BD) period. */
  manualLive: number;
}

export type ConciergeLink =
  | { status: "unconfigured" }
  | { status: "unreachable" }
  | { status: "ok"; snapshot: ConciergeSnapshot };

export type ConciergeResult<T> =
  | { status: "unconfigured" }
  | { status: "unreachable" }
  | { status: "ok"; data: T };

let pool: Pool | null = null;
let poolForUrl: string | null = null;

function getPool(url: string): Pool {
  if (pool && poolForUrl === url) return pool;
  // A stale pool (URL changed under us) is closed, never reused.
  if (pool) void pool.end().catch(() => {});
  const next = new Pool({
    connectionString: url,
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  next.on("connect", (client) => {
    // Belt-and-suspenders over the role's SELECT-only grants: this
    // session cannot write even if handed a mightier role one day.
    client
      .query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
      .catch(() => {});
  });
  next.on("error", () => {});
  pool = next;
  poolForUrl = url;
  return next;
}

/** Test seam only — closes the cached pool so scripts can exit. */
export async function closeConciergePool(): Promise<void> {
  if (pool) await pool.end().catch(() => {});
  pool = null;
  poolForUrl = null;
}

async function count(
  db: Pool,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const res = await db.query(sql, params as never[]);
  return Number(res.rows[0]?.count ?? 0);
}

/** Fail-soft runner: unset → unconfigured, any DB error →
 *  unreachable (one log line, URL never logged). Never throws. */
async function withLink<T>(
  fn: (db: Pool) => Promise<T>,
): Promise<ConciergeResult<T>> {
  const url = process.env.CONCIERGE_DATABASE_URL?.trim();
  if (!url) return { status: "unconfigured" };
  const db = getPool(url);
  try {
    return { status: "ok", data: await fn(db) };
  } catch (err) {
    // One line, no secrets: the URL never leaves this module.
    console.error(
      `concierge-link unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { status: "unreachable" };
  }
}

/** Never throws: every failure mode folds into the status. */
export async function getConciergeSnapshot(): Promise<ConciergeLink> {
  const res = await withLink(async (db) => {
    const [
      ownersActive,
      ownersTotal,
      propertiesActive,
      propertiesTotal,
      planRows,
      trialRows,
      conversationsThisMonth,
      stripeRows,
      manualLive,
    ] = await Promise.all([
      count(
        db,
        `SELECT COUNT(*)::int AS count FROM "User" WHERE role = 'OWNER' AND active = true`,
      ),
      count(db, `SELECT COUNT(*)::int AS count FROM "User" WHERE role = 'OWNER'`),
      count(
        db,
        `SELECT COUNT(*)::int AS count FROM "Property" WHERE status = 'ACTIVE'`,
      ),
      count(db, `SELECT COUNT(*)::int AS count FROM "Property"`),
      db.query(
        `SELECT tier, COUNT(*)::int AS count FROM "Subscription" GROUP BY tier ORDER BY tier`,
      ),
      db.query(
        `SELECT p.name AS "propertyName", s."trialEndsAt" AS "trialEndsAt"
         FROM "Subscription" s JOIN "Property" p ON p.id = s."propertyId"
         WHERE s.status = 'TRIAL' AND s."trialEndsAt" <= NOW() + INTERVAL '7 days'
         ORDER BY s."trialEndsAt" ASC LIMIT 20`,
      ),
      count(
        db,
        `SELECT COUNT(*)::int AS count FROM "Conversation"
         WHERE "createdAt" >= date_trunc('month', NOW())`,
      ),
      db.query(
        `SELECT interval AS interval, COUNT(*)::int AS count FROM "Subscription"
         WHERE status IN ('ACTIVE', 'PAST_DUE') AND "stripeSubscriptionId" IS NOT NULL
         GROUP BY interval ORDER BY interval`,
      ),
      count(
        db,
        `SELECT COUNT(*)::int AS count FROM "Property"
         WHERE "manualPlan" IS NOT NULL AND "manualPeriodEnd" > NOW()`,
      ),
    ]);
    const snapshot: ConciergeSnapshot = {
      ownersActive,
      ownersTotal,
      propertiesActive,
      propertiesTotal,
      planMix: (planRows.rows as { tier: string; count: number }[]).map((r) => ({
        tier: r.tier,
        count: Number(r.count),
      })),
      trialsEnding: (
        trialRows.rows as { propertyName: string; trialEndsAt: Date }[]
      ).map((r) => ({
        propertyName: r.propertyName,
        trialEndsAt: new Date(r.trialEndsAt).toISOString(),
      })),
      conversationsThisMonth,
      stripeActive: (
        stripeRows.rows as { interval: string; count: number }[]
      ).map((r) => ({ interval: r.interval, count: Number(r.count) })),
      manualLive,
    };
    return snapshot;
  });
  if (res.status !== "ok") return res;
  return { status: "ok", snapshot: res.data };
}

// ---- S2 customers (read side) ----

// Tier quotas mirror Concierge lib/billing.ts TIER_QUOTA (quotas only,
// never prices). Unknown tiers fall back to Starter, same drift rule.
const TIER_QUOTA: Record<string, number> = {
  STARTER: 500,
  GROWTH: 2000,
  SCALE: 7500,
};
const HARD_STOP_RATIO = 1.2;

function quotaForTier(tier: string): number {
  return TIER_QUOTA[tier] ?? TIER_QUOTA.STARTER;
}

/** Operator-facing service state. Mirrors the Concierge gate order
 *  (hold → live manual → subscription machine); keep in sync with
 *  gateDecision in Concierge lib/billing.ts. */
export type CustomerState =
  | { state: "paused-by-vivereply" }
  | { state: "trial"; daysLeft: number }
  | { state: "active"; manual: boolean }
  | { state: "past-due" }
  | { state: "paused-quota" }
  | { state: "trial-ended" }
  | { state: "ended" }
  | { state: "none" }
  | { state: "unknown" };

export interface StatusInputs {
  sub: {
    tier: string;
    status: string;
    trialEndsAt: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    overageAgreed: boolean;
  } | null;
  adminHold: boolean;
  manualPlan: string | null;
  manualPeriodEnd: string | null;
  usageThisMonth: number;
  now: Date;
}

export function deriveCustomerState(i: StatusInputs): CustomerState {
  if (i.adminHold) return { state: "paused-by-vivereply" };
  if (
    i.manualPlan &&
    i.manualPeriodEnd &&
    i.now.getTime() <= new Date(i.manualPeriodEnd).getTime()
  ) {
    if (
      i.usageThisMonth >=
      Math.floor(quotaForTier(i.manualPlan) * HARD_STOP_RATIO)
    ) {
      return { state: "paused-quota" };
    }
    return { state: "active", manual: true };
  }
  const sub = i.sub;
  if (!sub) return { state: "none" };
  const trialEnd = new Date(sub.trialEndsAt).getTime();
  switch (sub.status) {
    case "TRIAL": {
      if (i.now.getTime() > trialEnd) return { state: "trial-ended" };
      if (i.usageThisMonth >= Math.floor(TIER_QUOTA.GROWTH * HARD_STOP_RATIO)) {
        return { state: "paused-quota" };
      }
      const daysLeft = Math.ceil((trialEnd - i.now.getTime()) / 86_400_000);
      return { state: "trial", daysLeft: Math.max(0, daysLeft) };
    }
    case "ACTIVE":
      if (
        i.usageThisMonth >=
          Math.floor(quotaForTier(sub.tier) * HARD_STOP_RATIO) &&
        !sub.overageAgreed
      ) {
        return { state: "paused-quota" };
      }
      return { state: "active", manual: false };
    case "PAST_DUE":
      return { state: "past-due" };
    case "CANCELED": {
      const end = sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).getTime()
        : null;
      if (sub.cancelAtPeriodEnd && end && i.now.getTime() <= end) {
        return { state: "active", manual: false };
      }
      return { state: "ended" };
    }
    case "EXPIRED":
      return { state: "ended" };
    default:
      return { state: "unknown" };
  }
}

/** One-line operator label for a derived state. */
export function stateLabel(s: CustomerState): string {
  switch (s.state) {
    case "paused-by-vivereply":
      return "Paused by ViveReply";
    case "trial":
      return `Trial (${s.daysLeft}d left)`;
    case "active":
      return s.manual ? "Active (manual)" : "Active";
    case "past-due":
      return "Past due (served)";
    case "paused-quota":
      return "Paused (quota)";
    case "trial-ended":
      return "Trial ended";
    case "ended":
      return "Ended";
    case "none":
      return "No subscription";
    case "unknown":
      return "Unknown state";
  }
}

export interface SuiteBindingState {
  suiteBaseUrl: string;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
}

export interface CustomerRow {
  propertyId: string;
  name: string;
  propertyStatus: string;
  createdAt: string;
  owners: string[];
  /** Effective plan: live manual plan, else the subscription tier. */
  plan: string | null;
  manual: boolean;
  customerState: CustomerState;
  trialEndsAt: string | null;
  /** Renewal-ish date: manual end, else current period end. */
  periodEnd: string | null;
  usageThisMonth: number;
  quotaThisMonth: number;
  binding: SuiteBindingState | null;
  adminHold: boolean;
  manualPlan: string | null;
  manualPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface CustomerQueryRow {
  propertyId: string;
  name: string;
  propertyStatus: string;
  createdAt: Date;
  adminHold: boolean;
  manualPlan: string | null;
  manualPeriodEnd: Date | null;
  tier: string | null;
  interval: string | null;
  subStatus: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  overageAgreed: boolean | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  suiteBaseUrl: string | null;
  lastTestedAt: Date | null;
  lastTestOk: boolean | null;
  owners: string[] | null;
  usage: string | number;
}

const CUSTOMER_SELECT = `
  SELECT p.id AS "propertyId", p.name AS name, p.status AS "propertyStatus",
    p."createdAt" AS "createdAt", p."adminHold" AS "adminHold",
    p."manualPlan" AS "manualPlan", p."manualPeriodEnd" AS "manualPeriodEnd",
    s.tier AS tier, s.interval AS interval, s.status AS "subStatus",
    s."trialEndsAt" AS "trialEndsAt", s."currentPeriodEnd" AS "currentPeriodEnd",
    s."cancelAtPeriodEnd" AS "cancelAtPeriodEnd", s."overageAgreed" AS "overageAgreed",
    s."stripeCustomerId" AS "stripeCustomerId",
    s."stripeSubscriptionId" AS "stripeSubscriptionId",
    b."suiteBaseUrl" AS "suiteBaseUrl", b."lastTestedAt" AS "lastTestedAt",
    b."lastTestOk" AS "lastTestOk",
    (SELECT COALESCE(array_agg(u.email ORDER BY u.email), '{}')
     FROM "User" u WHERE u."propertyId" = p.id AND u.role = 'OWNER') AS owners,
    (SELECT COUNT(*) FROM "Conversation" c
     WHERE c."propertyId" = p.id AND c."createdAt" >= date_trunc('month', NOW())) AS usage
  FROM "Property" p
  LEFT JOIN "Subscription" s ON s."propertyId" = p.id
  LEFT JOIN "PropertyBinding" b ON b."propertyId" = p.id
`;

function toIso(v: Date | string | null): string | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function mapCustomerRow(r: CustomerQueryRow, now: Date): CustomerRow {
  const sub =
    r.subStatus && r.tier && r.trialEndsAt
      ? {
          tier: r.tier,
          status: r.subStatus,
          trialEndsAt: toIso(r.trialEndsAt) as string,
          currentPeriodEnd: toIso(r.currentPeriodEnd),
          cancelAtPeriodEnd: r.cancelAtPeriodEnd ?? false,
          overageAgreed: r.overageAgreed ?? false,
        }
      : null;
  const usage = Number(r.usage);
  const manualPeriodEnd = toIso(r.manualPeriodEnd);
  const manualLive =
    !!r.manualPlan &&
    !!manualPeriodEnd &&
    now.getTime() <= new Date(manualPeriodEnd).getTime();
  const customerState = deriveCustomerState({
    sub,
    adminHold: r.adminHold,
    manualPlan: r.manualPlan,
    manualPeriodEnd,
    usageThisMonth: usage,
    now,
  });
  const liveManualPlan = manualLive && r.manualPlan ? r.manualPlan : null;
  const quotaThisMonth = liveManualPlan
    ? quotaForTier(liveManualPlan)
    : !sub
      ? TIER_QUOTA.GROWTH
      : sub.status === "TRIAL"
        ? TIER_QUOTA.GROWTH
        : quotaForTier(sub.tier);
  return {
    propertyId: r.propertyId,
    name: r.name,
    propertyStatus: r.propertyStatus,
    createdAt: toIso(r.createdAt) as string,
    owners: r.owners ?? [],
    plan: liveManualPlan ?? sub?.tier ?? null,
    manual: manualLive,
    customerState,
    trialEndsAt: sub ? toIso(r.trialEndsAt) : null,
    periodEnd: manualLive ? manualPeriodEnd : (sub?.currentPeriodEnd ?? null),
    usageThisMonth: usage,
    quotaThisMonth,
    binding: r.suiteBaseUrl
      ? {
          suiteBaseUrl: r.suiteBaseUrl,
          lastTestedAt: toIso(r.lastTestedAt),
          lastTestOk: r.lastTestOk,
        }
      : null,
    adminHold: r.adminHold,
    manualPlan: r.manualPlan,
    manualPeriodEnd,
    stripeCustomerId: r.stripeCustomerId,
    stripeSubscriptionId: r.stripeSubscriptionId,
  };
}

/** Every property with its owners, plan, derived state, month usage
 *  and Suite binding. Never throws (fail-soft). */
export async function listCustomers(): Promise<
  ConciergeResult<CustomerRow[]>
> {
  const now = new Date();
  return withLink(async (db) => {
    const res = await db.query(
      `${CUSTOMER_SELECT} ORDER BY p."createdAt" DESC`,
    );
    return (res.rows as CustomerQueryRow[]).map((r) =>
      mapCustomerRow(r, now),
    );
  });
}

export interface CustomerDetail extends CustomerRow {
  /** Conversations per ISO week-start (UTC), oldest first, 8 weeks. */
  weeklyConversations: { week: string; count: number }[];
  /** Approved widget-host domains (active only). */
  approvedDomains: string[];
}

/** One property + week history + widget domains. `data: null` when
 *  the property does not exist. Never throws (fail-soft). */
export async function getCustomer(
  propertyId: string,
): Promise<ConciergeResult<CustomerDetail | null>> {
  const now = new Date();
  return withLink(async (db) => {
    const [row, weeks, domains] = await Promise.all([
      db.query(`${CUSTOMER_SELECT} WHERE p.id = $1`, [propertyId]),
      db.query(
        `SELECT date_trunc('week', "createdAt")::date AS week, COUNT(*)::int AS count
         FROM "Conversation"
         WHERE "propertyId" = $1 AND "createdAt" >= NOW() - INTERVAL '8 weeks'
         GROUP BY 1 ORDER BY 1`,
        [propertyId],
      ),
      db.query(
        `SELECT domain FROM "ApprovedDomain"
         WHERE "propertyId" = $1 AND active = true ORDER BY domain`,
        [propertyId],
      ),
    ]);
    const found = (row.rows as CustomerQueryRow[])[0];
    if (!found) return null;
    return {
      ...mapCustomerRow(found, now),
      weeklyConversations: (
        weeks.rows as { week: Date | string; count: number }[]
      ).map((w) => ({
        week:
          w.week instanceof Date
            ? w.week.toISOString().slice(0, 10)
            : String(w.week).slice(0, 10),
        count: Number(w.count),
      })),
      approvedDomains: (domains.rows as { domain: string }[]).map(
        (d) => d.domain,
      ),
    };
  });
}

/** The three S3-writable columns, for before/after audit reads. */
export async function getPropertyGateState(
  propertyId: string,
): Promise<
  ConciergeResult<{
    adminHold: boolean;
    manualPlan: string | null;
    manualPeriodEnd: string | null;
  } | null>
> {
  return withLink(async (db) => {
    const res = await db.query(
      `SELECT "adminHold", "manualPlan", "manualPeriodEnd"
       FROM "Property" WHERE id = $1`,
      [propertyId],
    );
    const r = res.rows[0] as
      | {
          adminHold: boolean;
          manualPlan: string | null;
          manualPeriodEnd: Date | null;
        }
      | undefined;
    if (!r) return null;
    return {
      adminHold: r.adminHold,
      manualPlan: r.manualPlan,
      manualPeriodEnd: toIso(r.manualPeriodEnd),
    };
  });
}
