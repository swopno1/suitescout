// Area scouting — location-first lead discovery. Place name →
// Nominatim bbox → Overpass tourism candidates → normalized, deduped,
// junk-filtered prospects. Only fixed public hosts are ever fetched
// (user input travels inside encoded query params), so there is no
// SSRF surface. Usage-policy manners are built in: identifying UA,
// timeouts, one query per scout, exact-tag unions (regex scans time
// out on dense areas).
import {
  normalizeBdPhone,
  normalizeEmail,
  normalizeWebsite,
  // Explicit extension: keeps this module loadable by plain Node 24
  // (proofs) as well as the bundler.
} from "./normalize.ts";

const UA =
  "SuiteScout/0.1 (research bot; https://github.com/swopno1/suitescout)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
/** Refuse place boxes wider than this (degrees) — a whole country
 *  would time Overpass out and flood the board. */
const MAX_BBOX_SPAN = 1.5;

export interface ScoutBbox {
  south: number;
  west: number;
  north: number;
  east: number;
  displayName: string;
}

export interface OsmCandidate {
  name: string;
  lat: number | null;
  lon: number | null;
  website: string | null;
  /** Normalized +880 mobile, when the listing carries one. */
  phone: string | null;
  /** Original listing phone when it is not a valid mobile. */
  phone_raw: string | null;
  email: string | null;
}

/** Listed (not researched) contact, stored as JSON in prospects.contact. */
export interface ListedContact {
  email?: string;
  phone?: string;
  phone_raw?: string;
}

export function serializeListedContact(c: ListedContact): string {
  return JSON.stringify(c);
}

/** Parse prospects.contact defensively — garbage yields null. */
export function listedContact(contactJson: string | null): ListedContact | null {
  if (!contactJson) return null;
  try {
    const v = JSON.parse(contactJson) as Partial<ListedContact>;
    if (!v || typeof v !== "object") return null;
    const out: ListedContact = {};
    if (typeof v.email === "string" && v.email) out.email = v.email;
    if (typeof v.phone === "string" && v.phone) out.phone = v.phone;
    if (typeof v.phone_raw === "string" && v.phone_raw) {
      out.phone_raw = v.phone_raw;
    }
    return out.email || out.phone || out.phone_raw ? out : null;
  } catch {
    return null;
  }
}

export function listedContactCount(contactJson: string | null): number {
  const c = listedContact(contactJson);
  if (!c) return 0;
  return (c.email ? 1 : 0) + (c.phone ? 1 : 0) + (c.phone_raw ? 1 : 0);
}

/** Place name → bounding box, Bangladesh only. Throws honest errors
 *  for unknown places and absurdly broad areas. */
export async function geocodePlace(place: string): Promise<ScoutBbox> {
  const q = place.trim();
  if (q.length < 2) throw new Error("Name a place to scout.");
  const url =
    `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=bd&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Place lookup failed (HTTP ${res.status}).`);
  }
  const hits = (await res.json()) as {
    boundingbox?: [string, string, string, string];
    display_name?: string;
  }[];
  const hit = hits[0];
  const bb = hit?.boundingbox?.map(Number);
  if (!hit || !bb || bb.some((n) => !Number.isFinite(n))) {
    throw new Error(`"${q}" matched no place in Bangladesh.`);
  }
  const [south, north, west, east] = bb;
  if (
    north - south > MAX_BBOX_SPAN ||
    east - west > MAX_BBOX_SPAN
  ) {
    throw new Error(
      `"${hit.display_name ?? q}" is too broad — name a town or city.`,
    );
  }
  return { south, west, north, east, displayName: hit.display_name ?? q };
}

const LODGING_TAGS = [
  "hotel",
  "guest_house",
  "hostel",
  "motel",
  "resort",
  "chalet",
  "apartment",
];

/** All lodging candidates in a bbox, richest record per name. */
export async function scoutArea(bbox: ScoutBbox): Promise<OsmCandidate[]> {
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const union = LODGING_TAGS.map(
    (t) => `nwr["tourism"="${t}"](${box});`,
  ).join("");
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(`[out:json][timeout:50];(${union});out tags center;`)}`,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    throw new Error(`Area search failed (HTTP ${res.status}).`);
  }
  return parseOverpass(await res.json());
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

/** Parse raw Overpass JSON into candidates. Pure — proof-tested.
 *  Unnamed elements are skipped; same-name duplicates merge field by
 *  field so split records combine into one rich candidate. */
export function parseOverpass(json: unknown): OsmCandidate[] {
  const els = (json as { elements?: OverpassElement[] })?.elements;
  if (!Array.isArray(els)) return [];
  const byName = new Map<string, OsmCandidate>();
  for (const el of els) {
    const tags = el.tags ?? {};
    const name = (tags.name ?? "").trim();
    if (!name) continue;
    const website =
      normalizeWebsite(tags.website ?? tags["contact:website"] ?? "") ??
      null;
    const phoneRaw = (
      tags.phone ??
      tags["contact:phone"] ??
      ""
    ).trim();
    const phone = phoneRaw ? (normalizeBdPhone(phoneRaw) ?? null) : null;
    const email = tags.email ?? tags["contact:email"] ?? "";
    const cand: OsmCandidate = {
      name,
      lat: el.lat ?? el.center?.lat ?? null,
      lon: el.lon ?? el.center?.lon ?? null,
      website,
      phone,
      phone_raw: !phone && phoneRaw ? phoneRaw.slice(0, 40) : null,
      email: email ? (normalizeEmail(email) ?? null) : null,
    };
    const prev = byName.get(name);
    if (!prev) {
      byName.set(name, cand);
      continue;
    }
    // Same place mapped twice (node + building outline) — merge
    // fields instead of picking a winner, so a phone on one record
    // and a website on the other both survive.
    byName.set(name, {
      name,
      lat: prev.lat ?? cand.lat,
      lon: prev.lon ?? cand.lon,
      website: prev.website ?? cand.website,
      phone: prev.phone ?? cand.phone,
      phone_raw: prev.phone_raw ?? cand.phone_raw,
      email: prev.email ?? cand.email,
    });
  }
  return [...byName.values()];
}

/** Canonical name for dedupe: lowercased, de-punctuated, generic
 *  lodging words stripped from both ends. Falls back to the full
 *  cleaned name when stripping would leave nothing ("Hotel Plaza"). */
export function normalizeCandidateName(name: string): string {
  const full = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stripped = full
    .replace(/^the\s+/, "")
    .replace(/^(hotel|motel|resort|lodge|inn|palace)\s+/, "")
    .replace(
      /\s+(hotel and resort|hotel resort|resort and spa|resort spa|guest house|hotel|hotels|resort|resorts|motel|inn|lodge|cottage|cottages|villa|villas|palace|grand|plaza|international|spa)$/,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 3 ? stripped : full;
}

/** Government rest houses and civic buildings wear tourism tags but
 *  are never prospects — skip them loudly, not silently. */
export function isJunkCandidate(name: string): boolean {
  return /\bcircuit\s?house\b|\bdak\s?bungalow\b|\bforest\s?rest\s?house\b|\bgovt\b|\bgovernment\b|\bzila\s?parishad\b|\bupazila\s?parishad\b/i.test(
    name,
  );
}

/** Split fresh candidates from ones already on the board (same
 *  normalized website, or same canonical name). Deterministic and
 *  explainable — near-misses stay visible on the board for humans. */
export function dedupeCandidates(
  candidates: OsmCandidate[],
  existing: { name: string; website: string | null }[],
): { fresh: OsmCandidate[]; dupes: OsmCandidate[] } {
  const fresh: OsmCandidate[] = [];
  const dupes: OsmCandidate[] = [];
  const known = existing.map((e) => ({
    name: normalizeCandidateName(e.name),
    website: e.website ? (normalizeWebsite(e.website) ?? e.website) : null,
  }));
  for (const c of candidates) {
    const cn = normalizeCandidateName(c.name);
    const hit = known.some(
      (k) =>
        (c.website !== null && k.website === c.website) ||
        (cn !== "" && k.name === cn),
    );
    (hit ? dupes : fresh).push(c);
  }
  return { fresh, dupes };
}
