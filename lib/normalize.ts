// Normalization — pure. Every person- or company-facing value the
// agent stores passes through here, so the DB holds one canonical,
// error-free shape per kind: lowercase emails, +880 mobiles,
// tracker-free page URLs. Each function returns null for anything
// it cannot validate — extraction drops nulls, intake rejects them.
export function normalizeEmail(raw: string): string | null {
  let e = raw.trim().toLowerCase();
  if (e.startsWith("mailto:")) e = e.slice("mailto:".length);
  e = e.split("?")[0];
  if (e.length > 254) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) return null;
  if (/\.(png|jpe?g|gif|svg|css|js|webp|ico)$/.test(e)) return null;
  return e;
}

/** Bangladeshi mobile in +880 form. Tolerates visual separators,
 *  parenthesized country codes, and 00 international prefixes —
 *  then demands the strict operator shape, so landlines and
 *  fragments never pass. */
export function normalizeBdPhone(raw: string): string | null {
  const d = raw
    .replace(/[\s\-().]/g, "")
    .replace(/^\+/, "")
    .replace(/^00/, "");
  const e164 = d.startsWith("880")
    ? `+${d}`
    : d.startsWith("01")
      ? `+880${d.slice(1)}`
      : null;
  return e164 && /^\+8801[3-9]\d{8}$/.test(e164) ? e164 : null;
}

/** WhatsApp number as bare international digits for wa.me links. */
export function normalizeWhatsapp(raw: string): string | null {
  const n = raw.replace(/^\+/, "").replace(/[\s-]/g, "");
  const intl =
    n.startsWith("01") && n.length === 11 ? `880${n.slice(1)}` : n;
  return /^\d{7,15}$/.test(intl) ? intl : null;
}

/** Facebook page canonical form: www host, page slug only, trackers
 *  gone. profile.php?id= links keep the id and nothing else. */
export function normalizeFacebookUrl(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href.trim());
  } catch {
    return null;
  }
  const host = u.hostname
    .toLowerCase()
    .replace(/^(m|web|mbasic)\./, "");
  if (host !== "facebook.com" && host !== "www.facebook.com") {
    return null;
  }
  if (u.pathname.replace(/\/+$/, "") === "/profile.php") {
    const id = u.searchParams.get("id");
    return id && /^\d+$/.test(id)
      ? `https://www.facebook.com/profile.php?id=${id}`
      : null;
  }
  const seg = u.pathname.split("/").filter(Boolean)[0];
  if (!seg) return null;
  return `https://www.facebook.com/${seg}`;
}

/** Any supported social URL, cleaned (host lowercased, trackers and
 *  fragments gone) — or null when it is not a social link at all. */
export function normalizeSocialUrl(href: string): string | null {
  const t = href.trim();
  const fb = normalizeFacebookUrl(t);
  if (fb) return fb;
  // fb.com short links are Facebook too.
  try {
    const probe = new URL(t);
    if (
      probe.hostname.toLowerCase() === "fb.com" ||
      probe.hostname.toLowerCase() === "www.fb.com"
    ) {
      return normalizeFacebookUrl(
        t.replace(/\/\/([^/]*fb\.com)/i, "//www.facebook.com"),
      );
    }
  } catch {
    return null;
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const ok = ["instagram.com", "youtube.com", "youtu.be", "linkedin.com"].some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
  if (!ok) return null;
  const path = u.pathname.replace(/\/+$/, "");
  return `https://${host}${path}`;
}

/** Prospect website canonical form: http(s) only, no userinfo,
 *  lowercase host, no default port, no fragment, no bare trailing
 *  slash. Null = reject at intake. */
export function normalizeWebsite(raw: string): string | null {
  const t = raw.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  if (
    (u.protocol === "https:" && u.port === "443") ||
    (u.protocol === "http:" && u.port === "80")
  ) {
    u.port = "";
  }
  let s = u.toString();
  if (s.endsWith("/") && u.pathname === "/" && !u.search) {
    s = s.slice(0, -1);
  }
  return s;
}
