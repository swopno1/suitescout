import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authLog,
  createSessionValue,
} from "@/lib/session";

export const dynamic = "force-dynamic";

// Admin identity is env-driven (S1): APP_USER names the account,
// APP_PASSWORD is the secret. Both are REQUIRED — unset or empty
// either one and nobody can log in (fail closed).
/** Throttle: max failures per IP per window before 429. In-memory —
 *  one container instance, so one map is the whole store. */
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const FAIL_MAX = 20;
const failures = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

/** Length-agnostic constant-time compare via hashed digests. */
function secretsEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a, "utf8").digest();
  const db = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(da, db);
}

export async function POST(req: Request) {
  const username = process.env.APP_USER;
  const secret = process.env.APP_PASSWORD;
  const ip = clientIp(req);
  if (!username || !secret) {
    authLog(ip, "login_unconfigured");
    return NextResponse.json(
      { error: "Server login is not configured." },
      { status: 503 },
    );
  }
  const now = Date.now();
  const recent = (failures.get(ip) ?? []).filter(
    (t) => now - t < FAIL_WINDOW_MS,
  );
  if (recent.length >= FAIL_MAX) {
    authLog(ip, "login_throttled");
    return NextResponse.json(
      { error: "Too many attempts — try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ok =
    typeof body.username === "string" &&
    typeof body.password === "string" &&
    secretsEqual(body.username, username) &&
    secretsEqual(body.password, secret);
  if (!ok) {
    recent.push(now);
    failures.set(ip, recent);
    authLog(ip, "login_failed");
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }
  failures.delete(ip);
  authLog(ip, "login_ok");
  const session = await createSessionValue(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    // The tunnel serves HTTPS in production; plain HTTP locally.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return NextResponse.json({ ok: true });
}
