// Board search — pure, no APIs. Matches a normalized query across
// name, location, website domain, OTA listings and demand signals, so
// location search works fully offline on whatever research exists.
// "Cox's Bazar", "coxsbazar" and "COX BAZAR" all match each other.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SearchableProspect {
  name: string;
  website: string | null;
  location: string | null;
  ota_listings?: string[] | null;
  demand_signals?: string[] | null;
  score_band?: string | null;
}

/** Every query token must appear in at least one field (AND). */
export function matchesProspect(
  p: SearchableProspect,
  query: string,
): boolean {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystacks = [
    p.name,
    p.location ?? "",
    (p.website ?? "").replace(/^https?:\/\//i, ""),
    ...(p.ota_listings ?? []),
    ...(p.demand_signals ?? []),
    p.score_band ?? "",
  ].map(normalize);
  // Spaceless twin per field, so "coxsbazar" matches "Cox's Bazar"
  // and "seapearl" matches "Sea Pearl".
  const twins = haystacks.flatMap((h) => [h, h.replace(/ /g, "")]);
  return tokens.every((t) => twins.some((h) => h.includes(t)));
}
