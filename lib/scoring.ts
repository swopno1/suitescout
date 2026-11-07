// SuiteScout deterministic scoring — the 0–100 rubric; worked examples live in scripts/scoring-test.ts.
// The LLM explains; the rules score. This module is pure (no I/O, no
// imports with runtime side effects) so the worked examples can be
// regression-tested without a server or an API key.
//
// Rule readings (documented, because the spec's worked examples pin them):
// - "No working website" (+30) covers dead / none / hijacked. A dead
//   site does NOT also earn the +20 "no booking engine" — that row is
//   for a live site with no engine.
// - "Phone / WhatsApp / Facebook only" (+15) and "OTA dependent" (+15)
//   apply only when the property has NO direct booking — by definition
//   "only" and "dependent" exclude a working direct channel.
// - "Scale" (+10) is 20+ rooms OR 3+ distinct accommodation types
//   (Balishira lists Couple Cottage / Couple Deluxe / Couple Villa /
//   Family Villa — a multi-product operation, not a two-room cottage).
// - The two negative rows stack; the total is clamped to 0–100.

import type { ResearchData, ScoreBand } from "./types";

export interface ScoreResult {
  score: number;
  band: ScoreBand;
  /** One sentence per applied signal, with its evidence + points. */
  reasons: string[];
  /** The signal keys that fired, for the LLM reason-writer. */
  signals: string[];
}

function bandFor(score: number): ScoreBand {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export function scoreResearch(research: ResearchData): ScoreResult {
  const reasons: string[] = [];
  const signals: string[] = [];
  let score = 0;

  const site = research.website_status;
  if (site === "dead" || site === "none" || site === "hijacked") {
    score += 30;
    signals.push("no_website");
    const how =
      site === "dead"
        ? "its listed website does not resolve"
        : site === "none"
          ? "it has no website at all"
          : "its domain serves a hijacked/parked template";
    reasons.push(`No working website — ${how} (+30).`);
  } else if (site === "live" && research.has_booking_engine === false) {
    score += 20;
    signals.push("no_booking_engine");
    reasons.push(
      "Website exists but has no booking engine — visitors cannot check availability or book online (+20).",
    );
  }

  const direct = research.has_direct_booking === true;
  const contactOnly = research.contact_channels.some((c) =>
    ["phone", "whatsapp", "facebook"].includes(c),
  );
  if (contactOnly && !direct) {
    score += 15;
    signals.push("phone_only");
    reasons.push(
      `Bookings go through ${research.contact_channels.join(" / ")} only — no owned online channel (+15).`,
    );
  }

  if (research.ota_listings.length > 0 && !direct) {
    score += 15;
    signals.push("ota_dependent");
    reasons.push(
      `Dependent on OTAs / third-party sellers (${research.ota_listings.join(", ")}) — commission and guest data leak to middlemen (+15).`,
    );
  }

  if (research.demand_signals.length > 0) {
    score += 10;
    signals.push("demand");
    reasons.push(
      `Active demand signals: ${research.demand_signals.join("; ")} (+10).`,
    );
  }

  const rooms = research.room_count;
  const multiProduct = research.room_types.length >= 3;
  if ((rooms !== null && rooms >= 20) || multiProduct) {
    score += 10;
    signals.push("scale");
    reasons.push(
      rooms !== null && rooms >= 20
        ? `Scale — ${rooms} rooms, real reservation volume to convert (+10).`
        : `Scale — ${research.room_types.length} distinct accommodation types (${research.room_types.join(", ")}), a multi-product operation (+10).`,
    );
  }

  if (direct) {
    score -= 40;
    signals.push("has_direct_booking");
    reasons.push(
      "Already has working direct booking with payment — the core gap is closed (−40).",
    );
  }
  if (research.has_booking_engine === true) {
    score -= 30;
    signals.push("has_booking_engine");
    reasons.push(
      "Already runs a modern booking engine / PMS — little left for Suite to replace (−30).",
    );
  }

  score = Math.max(0, Math.min(100, score));
  return { score, band: bandFor(score), reasons, signals };
}
