// SuiteScout login wall. Single enforcement point for every route.
// The session check goes through /api/auth/verify (same container):
// middleware env vars are BUILD-TIME in self-hosted Next.js, so the
// middleware itself can never see the runtime APP_PASSWORD —
// verifying here would bake in an empty secret and lock everyone
// out (or worse, disagree with the login page and redirect-loop).
// Fail closed: no cookie, invalid session, or unreachable verifier →
// API callers get JSON 401, page visits redirect to /login.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Same container, always port 3000 (Dockerfile + compose agree).
// Hardcoded deliberately — process.env here would be build-time.
const VERIFY_URL = "http://127.0.0.1:3000/api/auth/verify";

const PUBLIC = [
  /^\/$/,
  /^\/login$/,
  /^\/api\/auth\/(login|verify)$/,
  /^\/_next\//,
  /^\/brand\//,
  /^\/favicon\.ico$/,
  /^\/og-image\.png$/,
];

async function sessionValid(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: unknown };
    return data.valid === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (await sessionValid(session)) return NextResponse.next();

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
