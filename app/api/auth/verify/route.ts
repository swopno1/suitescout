import { NextResponse } from "next/server";
import { verifySessionValue } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Session oracle for the middleware. Returns ONLY a boolean — no
 *  session data, no secrets — so exposing it is safe (an HMAC oracle
 *  gives an attacker nothing). Exists because middleware env vars are
 *  build-time in self-hosted Next: only node-runtime code sees the
 *  real APP_PASSWORD. */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const value = (body as { value?: unknown } | null)?.value;
  const secret = process.env.APP_PASSWORD;
  const valid =
    typeof value === "string" &&
    Boolean(secret) &&
    (await verifySessionValue(secret as string, value));
  return NextResponse.json({ valid });
}
