import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authLog } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Log out: expire the session cookie. The client then hard-navigates
 *  to /login. */
export async function POST(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  authLog(fwd?.split(",")[0]?.trim() || "unknown", "logout");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
