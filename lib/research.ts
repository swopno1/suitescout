// SuiteScout live research — BUILD-SPEC.md §6.
// Fetches the prospect's website + its public research sources
// (Facebook page + directory/listing URLs from the seed) and extracts
// the fact sheet. Every fact cites a source URL; anything unverifiable
// stays "unknown" — the agent never invents.
//
// Extraction is deterministic (regex + heuristics on the fetched HTML).
// The LLM only writes prose reasons and drafts — it never decides a
// fact, so a run is reproducible without an API key.

import type { Prospect, ResearchData } from "./types";
import { isGeneratedLabel } from "./prospect-label";

const UA =
  "SuiteScout/0.1 (research bot; https://github.com/swopno1/suitescout)";
const FETCH_TIMEOUT_MS = 20_000;
const MAX_TEXT_CHARS = 40_000;
const FETCH_RETRIES = 1; // one retry on timeout/abort only — slow shared hosts

interface FetchResult {
  url: string;
  finalUrl: string | null;
  ok: boolean;
  status: number | null;
  html: string | null;
  error: string | null;
}

async function fetchPage(url: string): Promise<FetchResult> {
  let last: FetchResult | null = null;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
        signal: controller.signal,
      });
      const html = await res.text();
      return {
        url,
        finalUrl: res.url,
        ok: res.ok,
        status: res.status,
        html,
        error: null,
      };
    } catch (err) {
      last = {
        url,
        finalUrl: null,
        ok: false,
        status: null,
        html: null,
        error: err instanceof Error ? err.message : "fetch failed",
      };
      // Retry only a timeout/abort — a slow host, not a dead one.
      const isAbort =
        (err instanceof Error && err.name === "AbortError") ||
        /aborted/i.test(last.error ?? "");
      if (!isAbort) break;
    } finally {
      clearTimeout(timer);
    }
  }
  return last as FetchResult;
}

function htmlToText(html: string): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return t.slice(0, MAX_TEXT_CHARS);
}

function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

const OTA_DOMAINS = [
  "booking.com",
  "agoda.com",
  "expedia.",
  "hotels.com",
  "tripadvisor.",
  "makemytrip",
  "chologhuri.com",
  "resortsbd.com",
  "wanderlog.com",
  "hotels1000.com",
  "glotels.com",
  "tripbooking.ai",
  "eurobookings.com",
  "goibibo",
  "cleartrip",
];

const ENGINE_DOMAINS = [
  "cloudbeds",
  "siteminder",
  "staah",
  "resova",
  "hotelmanager24",
  "bookonline",
  "directbooking",
  "booking engine",
  "rezlynx",
  "innkey",
];

const ROOM_TYPE_WORDS = [
  "cottage",
  "villa",
  "suite",
  "deluxe",
  "family",
  "couple",
  "premium",
  "executive",
  "honeymoon",
  "duplex",
  "standard",
  "superior",
  "economy",
  "luxury",
  "apartment",
  "chalet",
  "bungalow",
  "treehouse",
  "houseboat",
  "tent",
];

/** True accommodation types — the only words that count as "distinct
 *  products" in directory prose. Adjectives (deluxe, couple, premium…)
 *  describe variants, not products: a directory paragraph calling a
 *  9-villa lodge "premium couple villas" must not read as 4 products. */
const TRUE_ROOM_TYPES = [
  "cottage",
  "villa",
  "suite",
  "duplex",
  "chalet",
  "bungalow",
  "houseboat",
  "tent",
  "apartment",
];

function isLoginWall(text: string): boolean {
  return (
    text.length < 3000 &&
    /log (in|into) (to )?(facebook|continue)/i.test(text)
  );
}

function isHijacked(text: string): boolean {
  return (
    /lorem ipsum/i.test(text) ||
    /this domain (is )?for sale/i.test(text) ||
    /domain (is )?parked/i.test(text) ||
    /buy this domain/i.test(text)
  );
}

export interface ResearchOutcome {
  research: ResearchData;
  /** Human-readable fetch log for the run trace. */
  fetchLog: string[];
}

/** Live research for one prospect. Fetches the website (if any) plus
 *  the prospect's seeded public sources, then extracts §6 facts. */
export async function extractResearch(
  prospect: Prospect,
): Promise<ResearchOutcome> {
  const fetchLog: string[] = [];
  const sources: string[] = [];
  const texts: { url: string; requestedUrl: string; text: string; html: string }[] = [];

  const urls: string[] = [];
  if (prospect.website) urls.push(prospect.website);
  for (const s of prospect.research_sources ?? []) {
    if (!urls.includes(s)) urls.push(s);
  }

  let websiteStatus: ResearchData["website_status"] = prospect.website
    ? "unknown"
    : "none";
  let websiteFetched = false;

  for (const url of urls) {
    const r = await fetchPage(url);
    if (!r.ok || !r.html) {
      fetchLog.push(
        `✗ ${url} — ${r.status ? `HTTP ${r.status}` : r.error ?? "unreachable"}`,
      );
      // A failed website fetch (DNS / refused / timeout) means dead.
      if (url === prospect.website) {
        websiteStatus = "dead";
        websiteFetched = true;
        sources.push(url);
      }
      continue;
    }
    const text = htmlToText(r.html);
    if (isLoginWall(text)) {
      fetchLog.push(`⚠ ${url} — login wall, no facts taken`);
      sources.push(r.finalUrl ?? url);
      continue;
    }
    fetchLog.push(`✓ ${url} — HTTP ${r.status}, ${text.length} chars`);
    sources.push(r.finalUrl ?? url);
    texts.push({ url: r.finalUrl ?? url, requestedUrl: url, text, html: r.html });
    if (url === prospect.website) {
      websiteFetched = true;
      websiteStatus = isHijacked(text) ? "hijacked" : "live";
    }
  }

  if (prospect.website && !websiteFetched) {
    // Website URL existed but no fetch result was recorded (defensive).
    websiteStatus = "dead";
    sources.push(prospect.website);
  }

  const allText = texts.map((t) => t.text).join("\n");
  const allHrefs = texts.flatMap((t) => extractHrefs(t.html));

  // Room facts (count + types) come only from the prospect's own site
  // and from directory text NEAR the property's name. A listing page
  // that names twenty hotels would otherwise donate another property's
  // room count (Giriraj once read 22 rooms off a Bandarban list page)
  // or its marketing copy's room words (Sundori once read 7 types).
  // Generated labels ("Website: …") carry no name to scope by — an
  // empty token would match everywhere, so skip directory scoping and
  // read rooms from the own site only.
  const nameToken = isGeneratedLabel(prospect.name)
    ? ""
    : prospect.name
        .replace(/^the\s+/i, "")
        .split(/[\s-]+/)[0]
        .toLowerCase();
  const roomTextParts: string[] = [];
  const ownRoomTextParts: string[] = [];
  for (const t of texts) {
    // Own site = the URL we requested was the prospect's website
    // (finalUrl may differ after a redirect, so compare requestedUrl).
    const isOwn =
      prospect.website !== null && t.requestedUrl === prospect.website;
    if (isOwn) {
      roomTextParts.push(t.text);
      ownRoomTextParts.push(t.text);
      continue;
    }
    if (!nameToken) continue;
    const lowerText = t.text.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lowerText.indexOf(nameToken, from);
      if (idx === -1) break;
      roomTextParts.push(t.text.slice(idx, idx + 600));
      from = idx + nameToken.length;
    }
  }
  const roomText = roomTextParts.join("\n");
  const ownRoomText = ownRoomTextParts.join("\n");

  // --- booking engine / direct booking ---
  const lower = allText.toLowerCase();
  const hasEngineDomain = ENGINE_DOMAINS.some((d) => lower.includes(d));
  const hasAvailabilityFlow =
    /check availability/i.test(allText) &&
    /\b(pay|payment|pay now|card)\b/i.test(allText);
  // NOTE: a bare "Book Now" button is NOT an engine — brochure sites
  // (e.g. Balishira) have one and it only opens a request form. A real
  // engine shows an availability + payment flow, or a known engine
  // domain. Anything else is "unknown", never invented.
  const requestOnly =
    /booking request|request (a )?booking|call (us )?to book|reserve by phone/i.test(
      allText,
    );
  let hasBookingEngine: boolean | "unknown";
  if (hasEngineDomain || hasAvailabilityFlow) {
    hasBookingEngine = true;
  } else if (requestOnly || websiteStatus !== "live") {
    // A live site whose only booking path is a request form / phone call
    // has no engine; a dead site has no engine either.
    hasBookingEngine = false;
  } else {
    hasBookingEngine = "unknown";
  }
  const hasDirectBooking =
    hasBookingEngine === true && hasAvailabilityFlow ? true : false;

  // --- OTAs / third-party sellers ---
  const otaListings = [...new Set(
    OTA_DOMAINS.filter((d) =>
      allHrefs.some((h) => h.toLowerCase().includes(d)) ||
      lower.includes(d),
    ),
  )];

  // --- contact channels ---
  // Phone numbers are often printed spaced out ("+88 0 17 6655 7760"),
  // so collapse spaces/dashes between digits before matching.
  const digitsNorm = allText.replace(/(\d)[\s-]+(?=\d)/g, "$1");
  const channels = new Set<string>();
  if (
    /(\+?8801[3-9]\d{8}|01[3-9]\d{8})/.test(digitsNorm)
  )
    channels.add("phone");
  if (/wa\.me\//i.test(allText) || /whatsapp/i.test(allText))
    channels.add("whatsapp");
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(allText))
    channels.add("email");
  if (allHrefs.some((h) => h.toLowerCase().includes("facebook.com")))
    channels.add("facebook");

  // --- social links ---
  const socialLinks = [...new Set(
    allHrefs.filter((h) =>
      /facebook\.com|instagram\.com|youtube\.com|linkedin\.com/i.test(h),
    ),
  )].slice(0, 8);

  // --- room count + types (scoped text only — see above) ---
  let roomCount: number | null = null;
  const countMatches = [
    ...roomText.matchAll(
      /(\d+)[\s-]*(?:guest\s?rooms?|rooms?|villas?|cottages?|units?)\b/gi,
    ),
  ];
  for (const m of countMatches) {
    const n = Number(m[1]);
    if (n > 0 && n <= 500 && (roomCount === null || n > roomCount))
      roomCount = n;
  }
  // Own-site text lists the property's named products (all words count);
  // directory prose only counts true types (see TRUE_ROOM_TYPES).
  const roomTypes = [...new Set([
    ...ROOM_TYPE_WORDS.filter((w) =>
      new RegExp(`\\b${w}\\b`, "i").test(ownRoomText),
    ),
    ...TRUE_ROOM_TYPES.filter((w) =>
      new RegExp(`\\b${w}\\b`, "i").test(roomText),
    ),
  ])].slice(0, 8);

  // --- demand signals ---
  const demand: string[] = [];
  const rating = allText.match(/(\d\.\d)\s*[★☆]/);
  const reviews = allText.match(/(\d+)\s*reviews?/i);
  if (rating || (reviews && Number(reviews[1]) > 0)) {
    const parts: string[] = [];
    if (rating) parts.push(`Rated ${rating[1]}★`);
    if (reviews) parts.push(`${reviews[1]} reviews`);
    demand.push(parts.join(", "));
  }
  if (/top-rated|#1|no\.?\s*1/i.test(allText) && /resort/i.test(allText)) {
    demand.push("Top-rated in its area");
  }
  if (/offer|discount|% off|package|campaign/i.test(allText)) {
    demand.push("Active offers / campaigns on site");
  }
  if (/peak season|high season|winter.*peak/i.test(allText)) {
    demand.push("Peak-season demand");
  }

  // --- languages / mobile ---
  const languages: string[] = [];
  if (/[\u0980-\u09FF]/.test(allText)) languages.push("bn");
  if (/[a-zA-Z]{3,}/.test(allText)) languages.push("en");
  const mobileFriendly =
    texts.some((t) => /viewport/i.test(t.html)) || "unknown";

  const research: ResearchData = {
    has_website: prospect.website ? websiteStatus !== "none" : false,
    website_status: websiteStatus,
    has_booking_engine: hasBookingEngine,
    has_direct_booking: hasDirectBooking,
    ota_listings: otaListings,
    contact_channels: [...channels],
    languages,
    room_count: roomCount,
    room_types: roomTypes,
    location: prospect.location,
    social_links: socialLinks,
    mobile_friendly: mobileFriendly,
    demand_signals: demand.slice(0, 3),
    sources,
  };
  return { research, fetchLog };
}
