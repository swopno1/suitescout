// Safe external links — pure. Only http(s) URLs without userinfo may
// become <a href>. Stored research (social links, sources, evidence)
// comes from untrusted pages, so every render site passes through
// here; anything else renders as plain text.
export function safeHttpUrl(href: string): string | null {
  const t = href.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** SSRF range table: true = never fetch. Fail closed on malformed input. */
export function ipv4Blocked(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (cloud metadata)
  if (a === 0) return true; // this-host
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

export function ipv6Blocked(ip: string): boolean {
  // IPv4-mapped form — judge the v4 tail.
  if (ip.includes(".")) {
    const tail = ip.slice(ip.lastIndexOf(":") + 1);
    return ipv4Blocked(tail);
  }
  const first = ip.split(":")[0];
  const n = first === "" ? 0 : Number.parseInt(first, 16);
  if (!Number.isInteger(n)) return true;
  if (ip === "::1" || ip === "::") return true;
  if ((n & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((n & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((n & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}
