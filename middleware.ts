// SuiteScout login wall — HTTP Basic Auth, one shared secret.
// Protects every route (all pages + all /api/* routes). Fail closed:
// if APP_PASSWORD is unset or empty, everything returns 401 — the
// app never serves unauthenticated. Fixed username `demo`; the
// password is the shared secret from APP_PASSWORD (set in .env on
// the VM; judges use the demo login published in the submission).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const USERNAME = "demo";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SuiteScout"' },
  });
}

/** Constant-time string comparison (avoids leaking the secret length
 *  through timing). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function middleware(request: NextRequest): NextResponse {
  const password = process.env.APP_PASSWORD;
  // Fail closed: no password configured → deny everything.
  if (!password) return unauthorized();

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(auth.slice("Basic ".length));
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return unauthorized();
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  if (user !== USERNAME || !safeEqual(pass, password)) {
    return unauthorized();
  }
  return NextResponse.next();
}

export const config = {
  // Every route, including API routes and the root page.
  matcher: ["/:path*"],
};
