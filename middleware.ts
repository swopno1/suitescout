// SuiteScout login wall — HMAC-signed session cookie (see lib/session.ts).
// Protects every route except /login, the login API, and static assets.
// Fail closed: no valid session → API callers get JSON 401, page visits
// redirect to /login. Unset APP_PASSWORD means no session can ever
// verify, so the app never serves unauthenticated.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/session";

const PUBLIC = [
  /^\/login$/,
  /^\/api\/auth\/login$/,
  /^\/_next\//,
  /^\/brand\//,
  /^\/favicon\.ico$/,
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const secret = process.env.APP_PASSWORD;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (
    secret &&
    session &&
    (await verifySessionValue(secret, session))
  ) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Every route, including API routes and the root page.
  matcher: ["/:path*"],
};
