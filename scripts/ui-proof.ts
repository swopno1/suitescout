// UI-overhaul proof. Pure section runs anywhere under plain Node 24
// (no DB, extension-ful imports); the pg section is read-only, skips
// without DATABASE_URL, and needs tsx for lib/db's extensionless
// imports. Pure: `node scripts/ui-proof.ts`. Full: `tsx scripts/ui-proof.ts`.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { businessDaysOut } from "../lib/business-days.ts";
import { matchesProspect, normalize } from "../lib/board-search.ts";
import { evaluateLead, type LeadSnapshot } from "../lib/evaluate.ts";
import { formatWhen, relativeAge } from "../lib/format.ts";
import { ipv4Blocked, ipv6Blocked, safeHttpUrl } from "../lib/safe-url.ts";
import {
  dedupeCandidates,
  isJunkCandidate,
  listedContact,
  listedContactCount,
  normalizeCandidateName,
  parseOverpass,
  serializeListedContact,
} from "../lib/geo.ts";
import {
  normalizeBdPhone,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeSocialUrl,
  normalizeWebsite,
  normalizeWhatsapp,
} from "../lib/normalize.ts";
import {
  displayName,
  domainOf,
  hasAnyField,
  isGeneratedLabel,
  prospectLabel,
} from "../lib/prospect-label.ts";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// --- prospect-label ---
check("label: website-only yields domain label", () => {
  assert.equal(
    prospectLabel({ website: "https://www.sea-pearl.com/book" }),
    "Website: sea-pearl.com",
  );
});
check("label: location-only yields location label", () => {
  assert.equal(prospectLabel({ location: "Cox's Bazar" }), "Cox's Bazar prospect");
});
check("label: empty yields untitled", () => {
  assert.equal(prospectLabel({}), "Untitled prospect");
});
check("label: min-1 rule", () => {
  assert.equal(hasAnyField({ name: "  " }), false);
  assert.equal(hasAnyField({ location: "Sylhet" }), true);
});
check("label: generated detection", () => {
  assert.equal(isGeneratedLabel("Website: x.com"), true);
  assert.equal(isGeneratedLabel("Sea Pearl"), false);
});
check("label: displayName falls back gracefully", () => {
  assert.equal(
    displayName({ id: 7, name: "Untitled prospect", website: null, location: "Sylhet" }),
    "Sylhet prospect",
  );
  assert.equal(domainOf("http://example.com/a?b=1"), "example.com");
});

// --- board-search ---
const SEA_PEARL = {
  name: "Sea Pearl",
  website: "https://seapearl.com",
  location: "Cox's Bazar",
  ota_listings: ["Booking.com"],
  demand_signals: ["sold out weekends"],
  score_band: "hot",
};
check("search: normalize strips punctuation", () => {
  assert.equal(normalize("Cox's Bazar!"), "cox s bazar");
});
check("search: all location spellings match", () => {
  for (const q of ["Cox's Bazar", "coxsbazar", "COX BAZAR"]) {
    assert.equal(matchesProspect(SEA_PEARL, q), true, q);
  }
});
check("search: OTA / demand / band / negative", () => {
  assert.equal(matchesProspect(SEA_PEARL, "booking"), true);
  assert.equal(matchesProspect(SEA_PEARL, "sold out"), true);
  assert.equal(matchesProspect(SEA_PEARL, "hot"), true);
  assert.equal(matchesProspect(SEA_PEARL, "bandarban"), false);
  assert.equal(matchesProspect(SEA_PEARL, "  "), true);
});

// --- format ---
const NOW = Date.parse("2026-11-07T18:00:00Z");
check("format: relative buckets", () => {
  assert.equal(relativeAge("2026-11-07T16:00:00Z", NOW), "2h ago");
  assert.equal(relativeAge("2026-11-04T18:00:00Z", NOW), "3d ago");
  assert.equal(relativeAge("2026-11-08T00:00:00Z", NOW), "upcoming");
  assert.equal(relativeAge("garbage", NOW), "");
});
check("format: Dhaka absolute + relative", () => {
  assert.equal(
    formatWhen("2026-11-07T15:32:00Z", NOW),
    "7 Nov, 21:32 · 2h ago",
  );
});

// --- businessDaysOut (Fri/Sat weekend, Asia/Dhaka) ---
check("dates: Friday +1 lands Sunday", () => {
  assert.equal(
    businessDaysOut(1, Date.parse("2026-11-06T12:00:00+06:00")),
    "2026-11-08",
  );
});
check("dates: Wednesday +1 lands Thursday", () => {
  assert.equal(
    businessDaysOut(1, Date.parse("2026-11-04T12:00:00+06:00")),
    "2026-11-05",
  );
});

// --- evaluate ---
function snap(over: Partial<LeadSnapshot>): LeadSnapshot {
  return {
    status: "new",
    lastStatusAt: "2026-11-06T18:00:00Z",
    created_at: "2026-11-06T18:00:00Z",
    fit_score: null,
    score_band: null,
    runs: [],
    drafts: [],
    followupDues: [],
    ...over,
  };
}
check("evaluate: fresh lead stays on-track", () => {
  const e = evaluateLead(snap({}), NOW);
  assert.equal(e.verdict, "on-track");
  assert.equal(e.suggested_action, "Run the agent to research and score it.");
});
check("evaluate: 5-day-old fresh lead needs nudge", () => {
  const e = evaluateLead(
    snap({ lastStatusAt: "2026-11-02T18:00:00Z" }),
    NOW,
  );
  assert.equal(e.verdict, "needs-nudge");
  assert.equal(e.suggested_action, "Run the agent now — this one should not wait.");
});
check("evaluate: failed runs ask for retry", () => {
  const e = evaluateLead(
    snap({
      runs: [{ status: "failed", started_at: "2026-11-06T18:00:00Z", finished_at: null }],
    }),
    NOW,
  );
  assert.equal(e.verdict, "needs-nudge");
  assert.equal(e.suggested_action, "Retry the failed run from the run view.");
});
check("evaluate: researched without drafts is stalled", () => {
  const e = evaluateLead(
    snap({
      status: "researched",
      fit_score: 80,
      score_band: "hot",
      runs: [{ status: "done", started_at: "2026-11-06T18:00:00Z", finished_at: "2026-11-06T18:05:00Z" }],
    }),
    NOW,
  );
  assert.equal(e.verdict, "stalled");
});
check("evaluate: sent draft on early stage nudges to Contacted", () => {
  const e = evaluateLead(
    snap({
      status: "researched",
      fit_score: 80,
      score_band: "hot",
      runs: [{ status: "done", started_at: "2026-11-06T18:00:00Z", finished_at: "2026-11-06T18:05:00Z" }],
      drafts: [{ channel: "email", status: "sent", created_at: "2026-11-06T18:00:00Z", approved_at: "2026-11-06T19:00:00Z", sent_at: "2026-11-06T20:00:00Z" }],
    }),
    NOW,
  );
  assert.equal(e.verdict, "needs-nudge");
  assert.equal(e.suggested_action, "Move the lead to Contacted to reflect reality.");
});
check("evaluate: overdue follow-up demands sending", () => {
  const e = evaluateLead(
    snap({
      status: "contacted",
      fit_score: 75,
      score_band: "hot",
      runs: [{ status: "done", started_at: "2026-11-01T18:00:00Z", finished_at: "2026-11-01T18:05:00Z" }],
      drafts: [{ channel: "email", status: "sent", created_at: "2026-11-01T18:00:00Z", approved_at: "2026-11-02T18:00:00Z", sent_at: "2026-11-03T18:00:00Z" }],
      followupDues: [{ dueAt: "2026-11-05", status: "pending" }],
    }),
    NOW,
  );
  assert.equal(e.verdict, "needs-nudge");
  assert.equal(e.suggested_action, "Send the follow-up now.");
});
check("evaluate: contactless researched lead needs a contact", () => {
  const e = evaluateLead(
    snap({
      status: "researched",
      fit_score: 80,
      score_band: "hot",
      runs: [{ status: "done", started_at: "2026-11-06T18:00:00Z", finished_at: "2026-11-06T18:05:00Z" }],
      drafts: [{ channel: "email", status: "draft", created_at: "2026-11-06T18:00:00Z", approved_at: null, sent_at: null }],
      contactCount: 0,
    }),
    NOW,
  );
  assert.equal(e.verdict, "needs-nudge");
  assert.equal(e.suggested_action, "Re-run to capture contacts, or pull one from their Facebook page — then send.");
  const withContact = evaluateLead(
    snap({
      status: "researched",
      fit_score: 80,
      score_band: "hot",
      runs: [{ status: "done", started_at: "2026-11-06T18:00:00Z", finished_at: "2026-11-06T18:05:00Z" }],
      drafts: [{ channel: "email", status: "draft", created_at: "2026-11-06T18:00:00Z", approved_at: null, sent_at: null }],
      contactCount: 2,
    }),
    NOW,
  );
  assert.equal(withContact.verdict, "on-track");
  assert.equal(withContact.suggested_action, "Review and approve a draft.");
});
check("evaluate: reply books the demo, closed rests", () => {
  const replied = evaluateLead(snap({ status: "replied" }), NOW);
  assert.equal(replied.verdict, "on-track");
  assert.equal(replied.suggested_action, "Book the Suite demo call now.");
  const closed = evaluateLead(snap({ status: "closed" }), NOW);
  assert.equal(closed.verdict, "closed");
});

// --- SSRF range table ---
check("ssrf: private/loopback/link-local v4 blocked, public allowed", () => {
  for (const ip of ["10.0.0.5", "172.16.0.1", "172.31.255.1", "192.168.1.1", "127.0.0.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "999.1.1.1"]) {
    assert.equal(ipv4Blocked(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1"]) {
    assert.equal(ipv4Blocked(ip), false, ip);
  }
});
check("ssrf: v6 special ranges + v4-mapped blocked, public allowed", () => {
  for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd00::1", "ff02::1", "::ffff:10.0.0.1"]) {
    assert.equal(ipv6Blocked(ip), true, ip);
  }
  for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) {
    assert.equal(ipv6Blocked(ip), false, ip);
  }
});

// --- safe external links ---
check("links: only plain http(s) become anchors", () => {
  assert.equal(safeHttpUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeHttpUrl("javascript:/*facebook.com*/alert(1)"), null);
  assert.equal(safeHttpUrl("ftp://example.com/x"), null);
  assert.equal(safeHttpUrl("https://user:pass@example.com/"), null);
  assert.equal(safeHttpUrl("not a url"), null);
});

// --- normalization ---
check("normalize: emails canonical, junk rejected", () => {
  assert.equal(normalizeEmail("  INFO@CoralBay.COM "), "info@coralbay.com");
  assert.equal(normalizeEmail("mailto:a@b.com?subject=x"), "a@b.com");
  assert.equal(normalizeEmail("logo@site.png"), null);
  assert.equal(normalizeEmail("not-an-email"), null);
});
check("normalize: BD mobiles to +880, fragments rejected", () => {
  assert.equal(normalizeBdPhone("01811-223344"), "+8801811223344");
  assert.equal(normalizeBdPhone("(+880) 18-11-223344"), "+8801811223344");
  assert.equal(normalizeBdPhone("+88 01766557760"), "+8801766557760");
  assert.equal(normalizeBdPhone("008801766557760"), "+8801766557760");
  assert.equal(normalizeBdPhone("01234"), null);
  assert.equal(normalizeBdPhone("88029112233"), null);
});
check("normalize: whatsapp digits, facebook canonical", () => {
  assert.equal(normalizeWhatsapp("+8801766557760"), "8801766557760");
  assert.equal(normalizeWhatsapp("01766557760"), "8801766557760");
  assert.equal(normalizeWhatsapp("abc"), null);
  assert.equal(
    normalizeFacebookUrl("https://m.facebook.com/CoralBay/?ref=x"),
    "https://www.facebook.com/CoralBay",
  );
  assert.equal(
    normalizeFacebookUrl("https://www.facebook.com/profile.php?id=12345&ref=ts"),
    "https://www.facebook.com/profile.php?id=12345",
  );
  assert.equal(normalizeFacebookUrl("https://evil.com/x"), null);
});
check("normalize: social + website shapes", () => {
  assert.equal(
    normalizeSocialUrl("https://youtu.be/abc123?t=5"),
    "https://youtu.be/abc123",
  );
  assert.equal(normalizeSocialUrl("/relative/path"), null);
  assert.equal(normalizeSocialUrl("https://evil.com/?x=facebook.com"), null);
  assert.equal(normalizeWebsite("https://Example.COM/"), "https://example.com");
  assert.equal(normalizeWebsite("http://x.com:80/a"), "http://x.com/a");
  assert.equal(normalizeWebsite("ftp://x"), null);
  assert.equal(normalizeWebsite("notaurl"), null);
});

// --- area scouting ---
check("scout: candidate names canonicalize for dedupe", () => {
  assert.equal(normalizeCandidateName("Sea Pearl Resort & Spa"), "sea pearl");
  assert.equal(normalizeCandidateName("The Hotel Sea Pearl"), "sea pearl");
  assert.equal(normalizeCandidateName("Hotel Plaza"), "plaza");
  assert.equal(normalizeCandidateName("Plaza Hotel"), "plaza");
  assert.equal(normalizeCandidateName("Inn"), "inn");
});
check("scout: junk filtered, real stays kept", () => {
  assert.equal(isJunkCandidate("Cox's Bazar Circuit House"), true);
  assert.equal(isJunkCandidate("Dak Bungalow, Bandarban"), true);
  assert.equal(isJunkCandidate("Rest Inn Hotel"), false);
  assert.equal(isJunkCandidate("Hotel Hill View"), false);
});
check("scout: dedupe by name and website", () => {
  const cands = [
    { name: "Sea Pearl", lat: null, lon: null, website: null, phone: null, phone_raw: null, email: null },
    { name: "Hotel Coastal Peace", lat: null, lon: null, website: "http://www.cotelcoastalpeace.com", phone: null, phone_raw: null, email: null },
    { name: "Brand New Resort", lat: null, lon: null, website: null, phone: null, phone_raw: null, email: null },
  ];
  const { fresh, dupes } = dedupeCandidates(cands, [
    { name: "Sea Pearl Resort & Spa", website: null },
    { name: "Something Else", website: "http://www.cotelcoastalpeace.com/" },
  ]);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].name, "Brand New Resort");
  assert.equal(dupes.length, 2);
});
check("scout: overpass parse merges split records, drops unnamed", () => {
  const out = parseOverpass({
    elements: [
      { tags: { tourism: "hotel" } },
      { lat: 1, lon: 2, tags: { name: "Sea Pearl", phone: "01766557760" } },
      {
        center: { lat: 1, lon: 2 },
        tags: {
          name: "Sea Pearl",
          website: "https://seapearl.example.com/",
          email: "INFO@seapearl.example.com",
        },
      },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].website, "https://seapearl.example.com");
  assert.equal(out[0].email, "info@seapearl.example.com");
  assert.equal(out[0].phone, "+8801766557760");
  assert.equal(out[0].phone_raw, null);
});
check("scout: listed contact round-trips, garbage is null", () => {
  const s = serializeListedContact({ email: "a@b.com", phone: "+8801700000000" });
  assert.deepEqual(listedContact(s), { email: "a@b.com", phone: "+8801700000000" });
  assert.equal(listedContactCount(s), 2);
  assert.equal(listedContact("garbage{"), null);
  assert.equal(listedContactCount(null), 0);
});

// --- seed snapshot (no DB) ---
check("seed: snapshot matches the SQLite export", () => {
  const p = path.resolve(process.cwd(), "data/seed-prospects.json");
  assert.equal(fs.existsSync(p), true, "run pnpm db:seed:export first");
  const rows = JSON.parse(fs.readFileSync(p, "utf8")) as { id: number }[];
  assert.equal(rows.length, 20);
  assert.deepEqual(rows.map((r) => r.id), Array.from({ length: 20 }, (_, i) => i + 1));
});

console.log(`\n pure section: ${passed} checks passed`);

// --- pg section: read-only, skips without DATABASE_URL ---
if (!process.env.DATABASE_URL) {
  console.log("pg section: skipped (DATABASE_URL not set) — run on the VM");
} else {
  const { getDataCounts, listPendingFollowups, listStatusEvents } =
    await import("../lib/db");
  const counts = await getDataCounts();
  assert.equal(typeof counts.prospects, "number");
  assert.equal(typeof counts.byStatus, "object");
  console.log(`pg ok - counts readable (${counts.prospects} prospects)`);
  await listPendingFollowups(1);
  console.log("pg ok - pending follow-ups readable");
  await listStatusEvents(1);
  console.log("pg ok - status events readable");
  console.log("pg section: 3 checks passed");
}
