// Concierge-link fail-soft test — lib/concierge-db.ts must never throw
// and must never touch the sales database. Run:
// `node scripts/concierge-link-test.ts` (Node 24 runs .ts directly).
// Exit code 1 on any failure. Live reads (the "ok" path) verify on
// the VM against the real concierge database (S1 acceptance §3).
import {
  closeConciergePool,
  getConciergeSnapshot,
} from "../lib/concierge-db.ts";

let failures = 0;

function check(name: string, cond: boolean): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) failures++;
}

delete process.env.CONCIERGE_DATABASE_URL;
const unconfigured = await getConciergeSnapshot();
check(
  "unset CONCIERGE_DATABASE_URL → unconfigured",
  unconfigured.status === "unconfigured",
);

process.env.CONCIERGE_DATABASE_URL = "";
const empty = await getConciergeSnapshot();
check("empty value → unconfigured", empty.status === "unconfigured");

// Closed port on localhost: connection refused, fast, no hang.
process.env.CONCIERGE_DATABASE_URL =
  "postgresql://superadmin_ro:bogus@127.0.0.1:1/concierge";
const started = Date.now();
const unreachable = await getConciergeSnapshot();
check(
  "unreachable database → unreachable (no throw)",
  unreachable.status === "unreachable",
);
check(
  `unreachable answers promptly (${Date.now() - started}ms)`,
  Date.now() - started < 15000,
);

await closeConciergePool();
if (failures > 0) {
  console.error(`${failures} concierge-link check(s) failed.`);
  process.exit(1);
}
console.log("concierge-link: all checks passed.");
