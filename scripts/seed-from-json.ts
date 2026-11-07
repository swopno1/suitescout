// Repeatable seed: load data/seed-prospects.json (exported from the
// SQLite rollback copy by scripts/export-sqlite-seed.py) into Postgres.
// No better-sqlite3 needed — runs anywhere with DATABASE_URL.
//
//   pnpm db:seed [--force]
//
// Without --force the script aborts when prospects is NOT empty.
// With --force it TRUNCATEs the pipeline tables first. Baseline
// status events for the seeded rows are created by the app's next
// boot migration.
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { SCHEMA_SQL } from "../lib/db";

const COLUMNS = [
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
];

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is required — set it to the PostgreSQL connection string.",
    );
    process.exit(1);
  }
  const jsonPath = path.resolve(process.cwd(), "data/seed-prospects.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(
      `Seed snapshot not found: ${jsonPath}\nRun: python3 scripts/export-sqlite-seed.py`,
    );
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<
    string,
    unknown
  >[];
  if (!Array.isArray(rows)) {
    console.error("Seed snapshot is not an array — re-export it.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      try {
        await client.query(SCHEMA_SQL);
        const existing = (await client.query(
          "SELECT COUNT(*)::int AS n FROM prospects",
        )) as { rows: { n: number }[] };
        if (existing.rows[0].n > 0 && !force) {
          throw new Error(
            `prospects already holds ${existing.rows[0].n} rows — aborting. Re-run with --force to TRUNCATE and seed anyway.`,
          );
        }
        if (existing.rows[0].n > 0) {
          await client.query(
            "TRUNCATE prospects, runs, drafts, followups, prospect_status_events RESTART IDENTITY CASCADE",
          );
        }
        for (const row of rows) {
          const values = COLUMNS.map((c) => {
            if (c === "demo") return row[c] === 1 || row[c] === true;
            return (row[c] as unknown) ?? null;
          });
          const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
          await client.query(
            `INSERT INTO prospects (${COLUMNS.join(", ")}) VALUES (${placeholders})`,
            values,
          );
        }
        await client.query(
          `SELECT setval(pg_get_serial_sequence('prospects', 'id'),
             COALESCE((SELECT MAX(id) FROM prospects), 1),
             COALESCE((SELECT MAX(id) FROM prospects), 0) > 0)`,
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      }
      console.log(`Seeded ${rows.length} prospects from data/seed-prospects.json.`);
      console.log("Baseline status events land on the app's next boot migration.");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
