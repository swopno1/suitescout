// Read-only link to the Concierge database (S1 foundation).
// This app NEVER writes to Concierge: the connection string must use
// the superadmin_ro role (SELECT-only grants), and every session is
// opened read-only as a second layer. Fail-soft by design — unset or
// unreachable just means the Customers section of /board says so;
// the sales tool never depends on this link.
import { Pool } from "pg";

// Table/column names mirror the Concierge Prisma schema (no @@map, so
// quoted PascalCase): "User", "Property", "Subscription",
// "Conversation". Keep these queries in sync with that schema.

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
}

export type ConciergeLink =
  | { status: "unconfigured" }
  | { status: "unreachable" }
  | { status: "ok"; snapshot: ConciergeSnapshot };

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

/** Never throws: every failure mode folds into the status. */
export async function getConciergeSnapshot(): Promise<ConciergeLink> {
  const url = process.env.CONCIERGE_DATABASE_URL?.trim();
  if (!url) return { status: "unconfigured" };
  const db = getPool(url);
  try {
    const [
      ownersActive,
      ownersTotal,
      propertiesActive,
      propertiesTotal,
      planRows,
      trialRows,
      conversationsThisMonth,
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
    ]);
    return {
      status: "ok",
      snapshot: {
        ownersActive,
        ownersTotal,
        propertiesActive,
        propertiesTotal,
        planMix: (planRows.rows as { tier: string; count: number }[]).map(
          (r) => ({ tier: r.tier, count: Number(r.count) }),
        ),
        trialsEnding: (
          trialRows.rows as { propertyName: string; trialEndsAt: Date }[]
        ).map((r) => ({
          propertyName: r.propertyName,
          trialEndsAt: new Date(r.trialEndsAt).toISOString(),
        })),
        conversationsThisMonth,
      },
    };
  } catch (err) {
    // One line, no secrets: the URL never leaves this module.
    console.error(
      `concierge-link unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { status: "unreachable" };
  }
}
