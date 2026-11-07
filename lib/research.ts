// SuiteScout live research.
// Fetches the prospect's website + its public research sources
// (Facebook page + directory/listing URLs from the seed) and extracts
// the fact sheet. Every fact cites a source URL; anything unverifiable
// stays "unknown" — the agent never invents.
//
// Extraction is deterministic (regex + heuristics on the fetched HTML).
// The LLM only writes prose reasons and drafts — it never decides a
// fact, so a run is reproducible without an API key.

import { lookup } from "node:dns/promises";
import type { Prospect, ResearchData } from "./types";
import {
  normalizeBdPhone,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizeSocialUrl,
  normalizeWhatsapp,
} from "./normalize";
import { isGeneratedLabel } from "./prospect-label";
import { ipv4Blocked, ipv6Blocked } from "./safe-url";

const UA =
  "SuiteScout/0.1 (research bot; https://github.com/swopno1/suitescout)";
const FETCH_TIMEOUT_MS = 20_000;
const MAX_TEXT_CHARS = 40_000;
const MAX_BODY_BYTES = 2_000_000; // 2 MB — anything bigger is not a resort page
const MAX_REDIRECTS = 5;
const FETCH_RETRIES = 1; // one retry on timeout/abort only — slow shared hosts

interface FetchResult {
  url: string;
  finalUrl: string | null;
  ok: boolean;
  status: number | null;
  html: string | null;
  error: string | null;
  /** Refused by the SSRF guard (never fetched) — distinct from dead. */
  blocked: boolean;
}

type Gate = { url: string } | { blocked: string };

/** SSRF guard: only public http(s) targets, DNS-resolved with every
 *  answer checked against private/loopback/link-local ranges. Fail
 *  closed: unresolvable hosts are refused, not fetched. Known limit:
 *  DNS-rebinding TOCTOU (a hostile name flipping between this check
 *  and fetch) needs connection pinning — post-judging work. */
async function assertPublicTarget(raw: string): Promise<Gate> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { blocked: "not a URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { blocked: `scheme ${u.protocol} refused` };
  }
  if (u.username || u.password) return { blocked: "userinfo refused" };
  if (!u.hostname) return { blocked: "empty host" };
  let addrs;
  try {
    // getaddrinfo also normalizes exotic literal forms (decimal,
    // hex, octal IPv4), so 2130706433 and 0x7f.0.0.1 are caught.
    addrs = await lookup(u.hostname, { all: true });
  } catch {
    return { blocked: "unresolvable host" };
  }
  for (const a of addrs) {
    const blocked =
      a.family === 4 ? ipv4Blocked(a.address) : ipv6Blocked(a.address);
    if (blocked) {
      return { blocked: `resolves to non-public IP ${a.address}` };
    }
  }
  return { url: u.toString() };
}

/** Read a body with a byte budget — a runaway page cannot eat memory. */
async function readCapped(
  res: Response,
): Promise<{ text: string } | { tooLarge: true }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: "" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { tooLarge: true };
    }
    chunks.push(value);
  }
  return { text: new TextDecoder().decode(Buffer.concat(chunks)) };
}

const REDIRECT = new Set([301, 302, 303, 307, 308]);

async function fetchPage(url: string): Promise<FetchResult> {
  let last: FetchResult | null = null;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      let current = url;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const gate = await assertPublicTarget(current);
        if ("blocked" in gate) {
          return {
            url,
            finalUrl: null,
            ok: false,
            status: null,
            html: null,
            error: `blocked: ${gate.blocked}`,
            blocked: true,
          };
        }
        const res = await fetch(gate.url, {
          headers: {
            "User-Agent": UA,
            Accept: "text/html,application/xhtml+xml",
          },
          // Manual hops so every redirect target passes the guard.
          redirect: "manual",
          signal: controller.signal,
        });
        if (REDIRECT.has(res.status)) {
          const loc = res.headers.get("location");
          await res.body?.cancel().catch(() => undefined);
          if (!loc) {
            return {
              url,
              finalUrl: gate.url,
              ok: false,
              status: res.status,
              html: null,
              error: `redirect without location (HTTP ${res.status})`,
              blocked: false,
            };
          }
          current = new URL(loc, gate.url).toString();
          continue;
        }
        const body = await readCapped(res);
        if ("tooLarge" in body) {
          return {
            url,
            finalUrl: gate.url,
            ok: false,
            status: res.status,
            html: null,
            error: "response too large (>2 MB)",
            blocked: false,
          };
        }
        return {
          url,
          finalUrl: gate.url,
          ok: res.ok,
          status: res.status,
          html: body.text,
          error: null,
          blocked: false,
        };
      }
      return {
        url,
        finalUrl: null,
        ok: false,
        status: null,
        html: null,
        error: `too many redirects (>${MAX_REDIRECTS})`,
        blocked: false,
      };
    } catch (err) {
      last = {
        url,
        finalUrl: null,
        ok: false,
        status: null,
        html: null,
        error: err instanceof Error ? err.message : "fetch failed",
        blocked: false,
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

/** Contact values on file (0 for runs predating contacts capture). */
export function contactCount(
  research: ResearchData | null | undefined,
): number {
  const c = research?.contacts;
  if (!c) return 0;
  return c.emails.length + c.phones.length + c.whatsapp.length;
}

export interface ContactValues {
  emails: string[];
  phones: string[];
  whatsapp: string[];
}

/** Pure contact parser — the exact step extractResearch runs on
 *  fetched page text + hrefs. Exported so proofs exercise real code. */
export function extractContacts(
  allText: string,
  allHrefs: string[],
): ContactValues {
  // Collapse spacing/dashes/parens between digits: "(+880) 18-11…"
  // must read as one number. The strict shape check below keeps this
  // from inventing numbers.
  const digitsNorm = allText.replace(/(\d)[\s\-().]+(?=\d)/g, "$1");
  // mailto: hrefs carry addresses whose anchor text may say "Email us".
  const mailto = allHrefs
    .filter((h) => h.toLowerCase().startsWith("mailto:"))
    .map((h) => h.slice("mailto:".length));
  const emails = [
    ...new Set(
      [
        ...allText.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi),
      ]
        .map((m) => m[0])
        .concat(mailto)
        .map((e) => normalizeEmail(e))
        .filter((e): e is string => e !== null),
    ),
  ].slice(0, 5);
  const phones = [
    ...new Set(
      [...digitsNorm.matchAll(/(\+?8801[3-9]\d{8}|01[3-9]\d{8})/g)]
        .map((m) => normalizeBdPhone(m[1]))
        .filter((p): p is string => p !== null),
    ),
  ].slice(0, 5);
  // wa.me links live in hrefs as well as text — search both.
  const waHay = `${allText}\n${allHrefs.join("\n")}`;
  const whatsapp = [
    ...new Set(
      [
        ...[...waHay.matchAll(/wa\.me\/(\d{7,15})/gi)].map((m) => m[1]),
        ...[
          ...waHay.matchAll(
            /api\.whatsapp\.com\/send[^"'`\s]*[?&]phone=(\+?\d{7,15})/gi,
          ),
        ].map((m) => m[1]),
      ]
        .map((n) => normalizeWhatsapp(n))
        .filter((n): n is string => n !== null),
    ),
  ].slice(0, 5);
  return { emails, phones, whatsapp };
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
      if (r.blocked) {
        // Refused by the SSRF guard — never fetched, so the site is
        // unknown, not dead. Recorded, never silent.
        fetchLog.push(`⊘ ${url} — refused (${r.error})`);
        if (url === prospect.website) {
          websiteStatus = "unknown";
          websiteFetched = true;
          sources.push(url);
        }
        continue;
      }
      fetchLog.push(
        `✗ ${url} — ${r.status ? `HTTP ${r.status}` : r.error ?? "unreachable"}`,
      );
      // A failed website fetch (refused / timeout) means dead.
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
  // Phone numbers are often printed spaced out ("+88 0 17 6655 7760",
  // "(+880) 18-11-223344"), so collapse spacing/dashes/parens between
  // digits before matching.
  const digitsNorm = allText.replace(/(\d)[\s\-().]+(?=\d)/g, "$1");
  const channels = new Set<string>();
  if (
    /(\+?8801[3-9]\d{8}|01[3-9]\d{8})/.test(digitsNorm)
  )
    channels.add("phone");
  if (/wa\.me\//i.test(allText) || /whatsapp/i.test(allText))
    channels.add("whatsapp");
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(allText))
    channels.add("email");
  if (
    allHrefs.some((h) => normalizeFacebookUrl(h) !== null)
  )
    channels.add("facebook");

  // --- contact values (the actual addresses/numbers, not just the
  // channel names) — a lead is only actionable with at least one. ---
  const { emails, phones, whatsapp } = extractContacts(allText, allHrefs);

  // --- social links (canonicalized: tracker-free, one shape) ---
  const socialLinks = [
    ...new Set(
      allHrefs
        .map((h) => normalizeSocialUrl(h))
        .filter((u): u is string => u !== null),
    ),
  ].slice(0, 8);

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
    contacts: { emails, phones, whatsapp },
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
