// Prospect display labels — pure. Intake allows any single field, so
// a prospect may arrive without a name. The DB keeps name NOT NULL;
// the API stores a generated label instead. Drafts and prompts use
// displayName() so website-only prospects read naturally.
export function domainOf(website: string): string {
  const bare = website.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return bare.split("/")[0].split("?")[0] || website.trim();
}

/** Label for a new prospect (id unknown yet): name → domain → location. */
export function prospectLabel(input: {
  name?: string | null;
  website?: string | null;
  location?: string | null;
}): string {
  const name = input.name?.trim();
  if (name) return name;
  const website = input.website?.trim();
  if (website) return `Website: ${domainOf(website)}`;
  const location = input.location?.trim();
  if (location) return `${location} prospect`;
  return "Untitled prospect";
}

/** Display name for a stored prospect (id fallback included). */
export function displayName(p: {
  id: number;
  name: string;
  website: string | null;
  location: string | null;
}): string {
  const name = p.name.trim();
  if (name && name !== "Untitled prospect") return name;
  if (p.website?.trim()) return `Website: ${domainOf(p.website)}`;
  if (p.location?.trim()) return `${p.location} prospect`;
  return `Prospect #${p.id}`;
}

/** True when the stored name is a generated label, not a real resort
 *  name — research skips name-based directory scoping for these (the
 *  token would be "website:" and match generic prose). */
export function isGeneratedLabel(name: string): boolean {
  const t = name.trim();
  return (
    t === "Untitled prospect" ||
    t.startsWith("Website: ") ||
    t === "Website:" ||
    (t.endsWith(" prospect") && !t.includes("  "))
  );
}

/** True when at least one intake field is filled (min-1 rule). */
export function hasAnyField(input: {
  name?: string | null;
  website?: string | null;
  location?: string | null;
}): boolean {
  return Boolean(
    input.name?.trim() || input.website?.trim() || input.location?.trim(),
  );
}
