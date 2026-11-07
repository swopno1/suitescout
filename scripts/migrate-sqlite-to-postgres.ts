// One-off data migration: SQLite (better-sqlite3) -> PostgreSQL.
// Run on the Vultr VM, where both the old ./data/suitescout.db file
// and the shared platform-postgres are reachable. The app itself no
// longer depends on SQLite after this change — this script is the
// only place better-sqlite3 is still used.
//
//   pnpm db:migrate-sqlite [--sqlite <path>] [--force]
//
//   --sqlite <path>   SQLite file to copy from (default ./data/suitescout.db)
//   --force           also copy when the Postgres tables are NOT empty
//                     (TRUNCATEs them first). Without --force the script
//                     aborts if any target table already has rows.
//
//   DATABASE_URL is required (same value the app uses).
//
// Copies ALL tables in FK order (prospects -> runs -> drafts ->
// followups -> settings) in a single transaction, preserving ids,
// converting the SQLite demo 0/1 to a Postgres boolean, and
// resetting each identity sequence to MAX(id) afterwards so future
// inserts do not collide. Does NOT seed — the app seeds the 20
// batch-3 prospects itself on first boot when prospects is empty.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { SCHEMA_SQL } from "../lib/db";

const TABLES = ["prospects", "runs", "drafts", "followups", "settings"] as const;

const COLUMNS: Record<(typeof TABLES)[number], string[]> = {
  prospects: [
    "id",
    "name",
    "website",
    "location",
    "source",
    "contact",
    "research_sources",
    "status",
    "fit_score",
    "score_band",
    "score_reasons",
    "research",
    "demo",
    "created_at",
    "updated_at",
  ],
  runs: ["id", "prospect_id", "steps", "status", "started_at", "finished_at"],
  drafts: ["id", "prospect_id", "channel", "subject", "body", "status", "created_at"],
  followups: ["id", "prospect_id", "draft_id", "due_after_days", "status"],
  settings: ["key", "value"],
};

function usage(): never {
  console.error("Usage: pnpm db:migrate-sqlite [--sqlite <path>] [--force]");
  console.error("  DATABASE_URL is required.");
  process.exit(2);
}

function parseArgs(argv: string[]): { sqlite: string; force: boolean } {
  let sqlite = "./data/suitescout.db";
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sqlite") {
      const v = argv[++i];
      if (!v) usage();
      sqlite = v;
    } else if (argv[i] === "--force") {
      force = true;
    } else {
      console.error(`Unknown argument: ${argv[i]}`);
      usage();
    }
  }
  return { sqlite, force };
}

async function main(): Promise<void> {
  const { sqlite, force } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is required — set it to the PostgreSQL connection string.",
    );
    process.exit(1);
  }
  const sqlitePath = path.isAbsolute(sqlite)
    ? sqlite
    : path.resolve(process.cwd(), sqlite);
  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite file not found: ${sqlitePath}`);
    process.exit(1);
  }

  const lite = new Database(sqlitePath, { readonly: true });
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const client = await pool.connect();
    try {
      const counts: Record<string, number> = {};
      await client.query("BEGIN");
      try {
        // Target schema first, so a fresh empty DB also gets its tables.
        await client.query(SCHEMA_SQL);

        // Safety: refuse to overwrite live data unless --force.
        let nonEmpty = false;
        for (const table of TABLES) {
          const res = await client.query(
            `SELECT COUNT(*)::int AS n FROM ${table}`,
          );
          if ((res.rows[0] as { n: number }).n > 0) nonEmpty = true;
        }
        if (nonEmpty && !force) {
          throw new Error(
            "Postgres tables are NOT empty — aborting. Re-run with --force to TRUNCATE and copy anyway.",
          );
        }
        if (nonEmpty) {
          await client.query(
            "TRUNCATE prospects, runs, drafts, followups, settings RESTART IDENTITY CASCADE",
          );
        }

        for (const table of TABLES) {
          const cols = COLUMNS[table];
          const rows = lite
            .prepare(`SELECT * FROM ${table}`)
            .all() as Record<string, unknown>[];
          for (const row of rows) {
            const values = cols.map((c) => {
              if (table === "prospects" && c === "demo")
                return row[c] === 1 || row[c] === true;
              return row[c] ?? null;
            });
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
            await client.query(
              `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
              values,
            );
          }
          counts[table] = rows.length;
        }

        // Reset identity sequences so future inserts continue past MAX(id).
        for (const table of ["prospects", "runs", "drafts", "followups"] as const) {
          await client.query(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'),
               COALESCE((SELECT MAX(id) FROM ${table}), 1),
               COALESCE((SELECT MAX(id) FROM ${table}), 0) > 0)`,
          );
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      }
      console.log("Migration complete:");
      for (const table of TABLES)
        console.log(`  ${table}: ${counts[table]} rows`);
      console.log("Old SQLite file left untouched (rollback copy).");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
    lite.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
