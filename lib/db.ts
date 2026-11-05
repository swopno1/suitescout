// SuiteScout SQLite layer — BUILD-SPEC.md §4.
// better-sqlite3, single file. Schema is created on first open and the
// 20 batch-3 prospects are seeded when the table is empty.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedProspects } from "./seed";
import type {
  Draft,
  Followup,
  Prospect,
  ProspectStatus,
  Run,
  RunStep,
  ScoreBand,
} from "./types";

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL || "./data/suitescout.db";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

declare global {
  // eslint-disable-next-line no-var
  var __suitescoutDb: Database.Database | undefined;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      website TEXT,
      location TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      contact TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      fit_score INTEGER,
      score_band TEXT,
      score_reasons TEXT,
      research TEXT,
      demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL REFERENCES prospects(id),
      steps TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      started_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL REFERENCES prospects(id),
      channel TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL REFERENCES prospects(id),
      draft_id INTEGER REFERENCES drafts(id),
      due_after_days INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function seedIfEmpty(db: Database.Database): void {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM prospects")
    .get() as { n: number };
  if (row.n > 0) return;
  const insert = db.prepare(
    `INSERT INTO prospects
      (name, website, location, source, contact, status, demo, created_at, updated_at)
     VALUES (@name, @website, @location, 'batch3', NULL, 'new', @demo, @now, @now)`,
  );
  seedProspects((p, now) => {
    insert.run({
      name: p.name,
      website: p.website,
      location: p.location,
      demo: p.demo ? 1 : 0,
      now,
    });
  });
}

export function getDb(): Database.Database {
  if (!globalThis.__suitescoutDb) {
    const file = resolveDbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    initSchema(db);
    seedIfEmpty(db);
    globalThis.__suitescoutDb = db;
  }
  return globalThis.__suitescoutDb;
}

// ---- Row mapping (JSON columns are stored as TEXT) ----

interface ProspectRow {
  id: number;
  name: string;
  website: string | null;
  location: string | null;
  source: string;
  contact: string | null;
  status: string;
  fit_score: number | null;
  score_band: string | null;
  score_reasons: string | null;
  research: string | null;
  demo: number;
  created_at: string;
  updated_at: string;
}

function mapProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    location: row.location,
    source: row.source,
    contact: row.contact,
    status: row.status as ProspectStatus,
    fit_score: row.fit_score,
    score_band: row.score_band as ScoreBand | null,
    score_reasons: row.score_reasons
      ? (JSON.parse(row.score_reasons) as string[])
      : null,
    research: row.research ? JSON.parse(row.research) : null,
    demo: row.demo === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface RunRow {
  id: number;
  prospect_id: number;
  steps: string;
  status: string;
  started_at: string;
  finished_at: string | null;
}

function mapRun(row: RunRow): Run {
  return {
    id: row.id,
    prospect_id: row.prospect_id,
    steps: JSON.parse(row.steps) as RunStep[],
    status: row.status as Run["status"],
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}

// ---- Prospects ----

export function listProspects(filters?: {
  status?: string;
  band?: string;
}): Prospect[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, string> = {};
  if (filters?.status) {
    where.push("status = @status");
    params.status = filters.status;
  }
  if (filters?.band) {
    where.push("score_band = @band");
    params.band = filters.band;
  }
  const sql =
    "SELECT * FROM prospects" +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    " ORDER BY demo DESC, name ASC";
  return (db.prepare(sql).all(params) as ProspectRow[]).map(mapProspect);
}

export function getProspect(id: number): Prospect | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM prospects WHERE id = ?")
    .get(id) as ProspectRow | undefined;
  return row ? mapProspect(row) : null;
}

export function createProspect(input: {
  name: string;
  website?: string | null;
  location?: string | null;
}): Prospect {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO prospects
        (name, website, location, source, contact, status, demo, created_at, updated_at)
       VALUES (?, ?, ?, 'manual', NULL, 'new', 0, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.website?.trim() || null,
      input.location?.trim() || null,
      now,
      now,
    );
  const created = getProspect(Number(result.lastInsertRowid));
  if (!created) throw new Error("Failed to create prospect");
  return created;
}

export function updateProspectStatus(
  id: number,
  status: ProspectStatus,
): Prospect | null {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE prospects SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, id);
  if (result.changes === 0) return null;
  return getProspect(id);
}

// ---- Runs ----

export function createRun(
  prospectId: number,
  steps: RunStep[],
): Run {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO runs (prospect_id, steps, status, started_at, finished_at)
       VALUES (?, ?, 'queued', ?, NULL)`,
    )
    .run(prospectId, JSON.stringify(steps), now);
  const created = getRun(Number(result.lastInsertRowid));
  if (!created) throw new Error("Failed to create run");
  return created;
}

export function getRun(id: number): Run | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as
    | RunRow
    | undefined;
  return row ? mapRun(row) : null;
}

export function getLatestRun(): Run | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM runs ORDER BY id DESC LIMIT 1")
    .get() as RunRow | undefined;
  return row ? mapRun(row) : null;
}

export function listRunsForProspect(prospectId: number): Run[] {
  const db = getDb();
  return (
    db
      .prepare("SELECT * FROM runs WHERE prospect_id = ? ORDER BY id DESC")
      .all(prospectId) as RunRow[]
  ).map(mapRun);
}

// ---- Drafts ----

export function getDraft(id: number): Draft | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as
    | Draft
    | undefined;
  return row || null;
}

export function listDraftsForProspect(prospectId: number): Draft[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM drafts WHERE prospect_id = ? ORDER BY id DESC",
    )
    .all(prospectId) as Draft[];
}

export function approveDraft(id: number): Draft | null {
  const db = getDb();
  const draft = db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as
    | Draft
    | undefined;
  if (!draft) return null;
  if (draft.status !== "draft") return draft;
  db.prepare("UPDATE drafts SET status = 'approved' WHERE id = ?").run(id);
  return db.prepare("SELECT * FROM drafts WHERE id = ?").get(id) as Draft;
}

// ---- Follow-ups ----

export function listFollowupsForProspect(prospectId: number): Followup[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM followups WHERE prospect_id = ? ORDER BY id DESC",
    )
    .all(prospectId) as Followup[];
}

// ---- Settings (key/value) ----

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(
    key,
  ) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}
