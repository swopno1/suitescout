import { NextRequest, NextResponse } from "next/server";
import { createProspect, listProspects } from "@/lib/db";
import {
  dedupeCandidates,
  geocodePlace,
  isJunkCandidate,
  scoutArea,
  serializeListedContact,
  type ListedContact,
} from "@/lib/geo";

export const dynamic = "force-dynamic";

/** Scout an area: place name → bbox → OSM lodging candidates →
 *  junk-filtered, deduped prospects (source=osm). Returns honest
 *  counts — found, junk-skipped, dupe-skipped, imported. */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const place = (body as { place?: unknown } | null)?.place;
  if (typeof place !== "string" || place.trim().length < 2) {
    return NextResponse.json(
      { error: "place (a town or city name) is required" },
      { status: 400 },
    );
  }
  if (place.trim().length > 100) {
    return NextResponse.json(
      { error: "place must be under 100 characters" },
      { status: 400 },
    );
  }

  let bbox;
  try {
    bbox = await geocodePlace(place);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "place lookup failed";
    const status = msg.includes("matched no place")
      ? 404
      : msg.includes("too broad") || msg.includes("Name a place")
        ? 400
        : 502;
    return NextResponse.json({ error: msg }, { status });
  }
  let candidates;
  try {
    candidates = await scoutArea(bbox);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "area search failed",
      },
      { status: 502 },
    );
  }

  const kept = candidates.filter((c) => !isJunkCandidate(c.name));
  const junk = candidates.length - kept.length;
  const existing = await listProspects();
  const { fresh, dupes } = dedupeCandidates(
    kept,
    existing.map((p) => ({ name: p.name, website: p.website })),
  );
  const location = bbox.displayName.split(",")[0].trim() || place.trim();
  const ids: number[] = [];
  for (const c of fresh) {
    const listed: ListedContact = {};
    if (c.email) listed.email = c.email;
    if (c.phone) listed.phone = c.phone;
    if (c.phone_raw) listed.phone_raw = c.phone_raw;
    const hasListed = listed.email || listed.phone || listed.phone_raw;
    const p = await createProspect({
      name: c.name,
      website: c.website,
      location,
      source: "osm",
      contact: hasListed ? serializeListedContact(listed) : null,
    });
    ids.push(p.id);
  }
  return NextResponse.json(
    {
      display_name: bbox.displayName,
      found: candidates.length,
      junk_skipped: junk,
      dupes_skipped: dupes.length,
      imported: ids.length,
      prospect_ids: ids,
    },
    { status: 201 },
  );
}
