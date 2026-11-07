#!/usr/bin/env python3
"""Export the current SQLite prospects as a committed JSON seed snapshot.

Reads ./data/suitescout.db read-only (python stdlib only — no
better-sqlite3 needed) and writes ./data/seed-prospects.json, which
`pnpm db:seed` loads into Postgres. Re-run after editing the rollback
copy to refresh the snapshot.

Other tables are NOT part of the seed; the script warns when they hold
rows that a reseed would leave behind.
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQLITE_PATH = ROOT / "data" / "suitescout.db"
OUT_PATH = ROOT / "data" / "seed-prospects.json"

PROSPECT_COLUMNS = [
    "id", "name", "website", "location", "source", "contact",
    "research_sources", "status", "fit_score", "score_band",
    "score_reasons", "research", "demo", "created_at", "updated_at",
]
NON_SEED_TABLES = ["runs", "drafts", "followups", "settings"]


def main() -> int:
    if not SQLITE_PATH.exists():
        print(f"SQLite file not found: {SQLITE_PATH}", file=sys.stderr)
        return 1
    con = sqlite3.connect(f"file:{SQLITE_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        rows = [
            {c: row[c] for c in PROSPECT_COLUMNS}
            for row in con.execute(
                f"SELECT {', '.join(PROSPECT_COLUMNS)} FROM prospects ORDER BY id"
            )
        ]
        leftovers = {}
        for table in NON_SEED_TABLES:
            try:
                n = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            except sqlite3.OperationalError:
                n = 0
            if n:
                leftovers[table] = n
    finally:
        con.close()
    OUT_PATH.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")
    print(f"Exported {len(rows)} prospects -> {OUT_PATH.relative_to(ROOT)}")
    if leftovers:
        print(
            "WARNING: these tables hold rows that db:seed does NOT copy: "
            + ", ".join(f"{t} ({n})" for t, n in leftovers.items()),
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
