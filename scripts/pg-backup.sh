#!/usr/bin/env bash
# SuiteScout Postgres backup — run on the Vultr VM, from the repo root:
#
#   ./scripts/pg-backup.sh            # one backup now
#   ./scripts/pg-backup.sh --cron     # same, quiet (for cron)
#
# Dumps the `suitescout` database (custom format) into ./backups/ via a
# throwaway postgres:16 client container on vivescript-net — nothing is
# installed on the host. Keeps the newest 7 dumps, deletes the rest.
# DATABASE_URL comes from the environment or the repo .env (same file
# the app uses); the password never lands in the dump filename.
#
# Suggested cron (nightly 03:10 Asia/Dhaka):
#   10 3 * * * cd ~/suitescout && ./scripts/pg-backup.sh --cron >>backups/cron.log 2>&1
#
# Restore into an empty database (DESTRUCTIVE — wipes target first):
#   docker run --rm --network vivescript-net -e PGPASSWORD='<db password>' \
#     -v "$PWD/backups:/b:ro" postgres:16-alpine \
#     pg_restore -h platform-postgres -U suitescout -d suitescout \
#       --clean --if-exists /b/suitescout-<stamp>.dump
#
# This covers database loss. Whole-VM loss additionally wants a weekly
# Vultr snapshot (console: server → Backups/Snapshots) — a 2-minute
# owner task, outside what any repo script can do.
set -euo pipefail

QUIET=0
if [ "${1:-}" = "--cron" ]; then QUIET=1; fi
say() { if [ "$QUIET" -eq 0 ]; then echo "$*"; fi; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

URL="${DATABASE_URL:-}"
if [ -z "$URL" ] && [ -f .env ]; then
  URL="$(grep -E '^DATABASE_URL=' .env | tail -n1 | cut -d= -f2-)"
fi
if [ -z "$URL" ]; then
  echo "DATABASE_URL is not set and no .env provides it." >&2
  exit 1
fi

# Parse with python3 (robust; percent-encoded chars in the password
# are decoded — a raw @ : / in the password is an invalid URL, use %40
# %3A %2F instead, same as any Postgres connection string).
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi
PARSED="$(python3 - "$URL" <<'EOF'
import shlex, sys
from urllib.parse import urlparse, unquote
u = urlparse(sys.argv[1])
if u.scheme != "postgresql" or not u.hostname or not u.username:
    print("DATABASE_URL is not a postgresql://user:pass@host/db URL.", file=sys.stderr)
    raise SystemExit(2)
print(f"HOST={shlex.quote(u.hostname)}")
print(f"USER={shlex.quote(unquote(u.username))}")
print(f"PASS={shlex.quote(unquote(u.password or ''))}")
print(f"DB={shlex.quote((u.path or '/').lstrip('/') or 'suitescout')}")
EOF
)" || exit 1
eval "$PARSED"

mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M)"
OUT="backups/suitescout-${STAMP}.dump"

say "Dumping ${DB} from ${HOST} → ${OUT} ..."
docker run --rm --network vivescript-net -e "PGPASSWORD=${PASS}" \
  postgres:16-alpine \
  pg_dump -h "$HOST" -U "$USER" -d "$DB" -F c >"$OUT"

if [ ! -s "$OUT" ]; then
  echo "Backup failed: ${OUT} is empty." >&2
  rm -f "$OUT"
  exit 1
fi
say "OK: $(du -h "$OUT" | cut -f1) in ${OUT}"

# Retention: newest 7 dumps stay.
KEPT="$(ls -1t backups/suitescout-*.dump | head -n 7 | wc -l)"
DELETED=0
for f in $(ls -1t backups/suitescout-*.dump | tail -n +8); do
  rm -f "$f"
  DELETED=$((DELETED + 1))
done
say "Retention: ${KEPT} kept, ${DELETED} pruned."
