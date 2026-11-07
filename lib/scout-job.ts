// Area-scout background job — geocode → search → import, with the
// scout row updated at every phase so the /scout view shows live
// progress. Never throws: failures land on the row as status=failed
// with the honest error.
import {
  createProspect,
  listProspects,
  updateScout,
} from "./db";
import {
  dedupeCandidates,
  geocodePlace,
  isJunkCandidate,
  scoutArea,
  serializeListedContact,
  type ListedContact,
} from "./geo";

export async function runScoutJob(
  scoutId: number,
  place: string,
): Promise<void> {
  const fail = (msg: string) =>
    updateScout(scoutId, {
      status: "failed",
      error: msg,
      finished_at: new Date().toISOString(),
    }).catch(() => null);
  try {
    await updateScout(scoutId, { phase: "geocoding" });
    let bbox;
    try {
      bbox = await geocodePlace(place);
    } catch (err) {
      await fail(err instanceof Error ? err.message : "place lookup failed");
      return;
    }
    await updateScout(scoutId, {
      phase: "searching",
      display_name: bbox.displayName,
      south: bbox.south,
      west: bbox.west,
      north: bbox.north,
      east: bbox.east,
    });
    let candidates;
    try {
      candidates = await scoutArea(bbox);
    } catch (err) {
      await fail(err instanceof Error ? err.message : "area search failed");
      return;
    }
    const kept = candidates.filter((c) => !isJunkCandidate(c.name));
    const junk = candidates.length - kept.length;
    const existing = await listProspects();
    const { fresh, dupes } = dedupeCandidates(
      kept,
      existing.map((p) => ({ name: p.name, website: p.website })),
    );
    await updateScout(scoutId, {
      phase: "importing",
      found: candidates.length,
      junk_skipped: junk,
      dupes_skipped: dupes.length,
    });
    const location =
      bbox.displayName.split(",")[0].trim() || place.trim();
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
      await updateScout(scoutId, {
        imported: ids.length,
        prospect_ids: ids,
      });
    }
    await updateScout(scoutId, {
      status: "done",
      phase: "done",
      finished_at: new Date().toISOString(),
    });
  } catch (err) {
    await fail(err instanceof Error ? err.message : "scout failed");
  }
}
