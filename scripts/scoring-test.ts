// SuiteScout scoring regression test — BUILD-SPEC.md §5 worked examples.
// Run: `node scripts/scoring-test.ts` (Node 24 runs .ts directly).
// The agent must reproduce these four scores from the batch-3 facts.
// Exit code 1 on any failure.
import { scoreResearch } from "../lib/scoring.ts";
import type { ResearchData } from "../lib/types.ts";

function base(overrides: Partial<ResearchData>): ResearchData {
  return {
    has_website: true,
    website_status: "live",
    has_booking_engine: false,
    has_direct_booking: false,
    ota_listings: [],
    contact_channels: [],
    languages: ["en"],
    room_count: null,
    room_types: [],
    location: "Bangladesh",
    social_links: [],
    mobile_friendly: "unknown",
    demand_signals: [],
    sources: [],
    ...overrides,
  };
}

interface Case {
  name: string;
  research: ResearchData;
  expectScore: number;
  expectBand: "hot" | "warm" | "cold";
}

const cases: Case[] = [
  {
    name: "The Cox Beach Resort — dead domain, OTA-only, 94 rooms, active campaigns",
    research: base({
      has_website: true,
      website_status: "dead",
      ota_listings: ["hotels1000.com", "wanderlog.com"],
      contact_channels: ["phone", "whatsapp"],
      demand_signals: ["Active Facebook discount campaigns"],
      room_count: 94,
      sources: [
        "https://thecoxbeachresort.com/",
        "https://www.hotels1000.com/BD/Cox%27s-Bazar/663954910465221/The-Cox-Beach-Resort",
      ],
    }),
    expectScore: 80,
    expectBand: "hot",
  },
  {
    name: "Sundori Eco Resort — dead site, third-party sellers, phone-only",
    research: base({
      website_status: "dead",
      ota_listings: ["chologhuri.com"],
      contact_channels: ["phone", "whatsapp"],
      demand_signals: [
        "Heavy vlog exposure",
        "Winter Sundarbans peak season",
      ],
      room_count: 9,
      room_types: ["villa", "duplex"],
    }),
    expectScore: 70,
    expectBand: "hot",
  },
  {
    name: "Balishira Resort — brochure site, no booking, phone-only, 4 room types, offers live",
    research: base({
      website_status: "live",
      has_booking_engine: false,
      contact_channels: ["phone", "email"],
      demand_signals: ["Active offers / campaigns on site"],
      room_count: null,
      room_types: [
        "Couple Cottage",
        "Couple Deluxe",
        "Couple Villa",
        "Family Villa",
      ],
    }),
    expectScore: 55,
    expectBand: "warm",
  },
  {
    name: "Giriraj Resort — no website, FB/phone only, top-rated",
    research: base({
      has_website: false,
      website_status: "none",
      contact_channels: ["facebook", "phone"],
      demand_signals: [
        "Rated 4.8★, 91 reviews",
        "Top-rated in its area",
        "Peak-season demand",
      ],
      room_count: 15,
    }),
    expectScore: 55,
    expectBand: "warm",
  },
  {
    name: "Already-booked property — direct booking + engine (clamp to 0, cold)",
    research: base({
      website_status: "live",
      has_booking_engine: true,
      has_direct_booking: true,
      demand_signals: ["Active offers / campaigns on site"],
    }),
    expectScore: 0,
    expectBand: "cold",
  },
  {
    name: "Live brochure site, no signals at all (0, cold)",
    research: base({ website_status: "live", has_booking_engine: false }),
    // no booking engine (+20) but nothing else: 20 = cold
    expectScore: 20,
    expectBand: "cold",
  },
];

let failures = 0;
for (const c of cases) {
  const got = scoreResearch(c.research);
  const ok = got.score === c.expectScore && got.band === c.expectBand;
  if (ok) {
    console.log(`PASS ${c.name} → ${got.score} ${got.band}`);
  } else {
    failures += 1;
    console.log(
      `FAIL ${c.name} → got ${got.score} ${got.band}, expected ${c.expectScore} ${c.expectBand}`,
    );
    console.log(`     reasons: ${got.reasons.join(" | ")}`);
  }
}
console.log(
  failures === 0
    ? `\nAll ${cases.length} scoring cases pass.`
    : `\n${failures} of ${cases.length} cases FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
