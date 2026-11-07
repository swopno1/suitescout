// Session cookies — HMAC-signed, no database, no dependencies.
// Value: "<expiryMs>.<base64url(HMAC-SHA256(APP_PASSWORD,
// 'suitescout:' + expiryMs))>". Rotating APP_PASSWORD invalidates
// every session at once. WebCrypto only, so this runs in middleware
// (edge), route handlers (node), and server components alike.
const SESSION_AUDIENCE = "suitescout";

export const SESSION_COOKIE = "suitescout_session";
/** Absolute session lifetime: 12 hours. */
export const SESSION_MAX_AGE_S = 12 * 60 * 60;

function b64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): { bytes: Uint8Array; buf: ArrayBuffer } {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  // Fresh allocation: never shared, full-span, so the cast is exact.
  return { bytes, buf: bytes.buffer as ArrayBuffer };
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function message(expiry: number): ArrayBuffer {
  return new TextEncoder().encode(`${SESSION_AUDIENCE}:${expiry}`)
    .buffer as ArrayBuffer;
}

export async function createSessionValue(
  secret: string,
): Promise<{ value: string; maxAge: number }> {
  const expiry = Date.now() + SESSION_MAX_AGE_S * 1000;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, message(expiry));
  return { value: `${expiry}.${b64urlEncode(sig)}`, maxAge: SESSION_MAX_AGE_S };
}

/** One-line auth audit event (timestamp, IP, outcome). Never carries
 *  secrets — logins, failures, throttles, logouts. Grep the container
 *  logs for AUTH= to review access. */
export function authLog(ip: string, event: string): void {
  console.log(
    `AUTH= ${new Date().toISOString()} ip=${ip} event=${event}`,
  );
}

/** Constant-time signature check (crypto.subtle.verify) + expiry. */
export async function verifySessionValue(
  secret: string,
  value: string,
): Promise<boolean> {
  const dot = value.indexOf(".");
  if (dot === -1) return false;
  const expiry = Number(value.slice(0, dot));
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  let sig: { bytes: Uint8Array; buf: ArrayBuffer };
  try {
    sig = b64urlDecode(value.slice(dot + 1));
  } catch {
    return false;
  }
  if (sig.bytes.length !== 32) return false;
  const key = await hmacKey(secret);
  try {
    return await crypto.subtle.verify("HMAC", key, sig.buf, message(expiry));
  } catch {
    return false;
  }
}
