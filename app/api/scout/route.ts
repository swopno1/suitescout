import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { createScout } from "@/lib/db";
import { runScoutJob } from "@/lib/scout-job";

export const dynamic = "force-dynamic";

/** Start an area scout: creates the scout row and works it in the
 *  background (geocode → search → import) so the client can watch
 *  GET /api/scouts/:id for live progress. Returns 202 immediately. */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const place = (body as { place?: unknown } | null)?.place;
  if (typeof place !== "string" || place.trim().length < 2) {
    return NextResponse.json(
      { error: "place (a town or city name) is required" },
      { status: 400 },
    );
  }
  if (place.trim().length > 100) {
    return NextResponse.json(
      { error: "place must be under 100 characters" },
      { status: 400 },
    );
  }
  const scout = await createScout(place.trim());
  after(() => runScoutJob(scout.id, place.trim()));
  return NextResponse.json({ scout }, { status: 202 });
}
