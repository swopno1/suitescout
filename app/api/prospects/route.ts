import { NextRequest, NextResponse } from "next/server";
import { createProspect, listProspects } from "@/lib/db";
import { hasAnyField, prospectLabel } from "@/lib/prospect-label";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const band = req.nextUrl.searchParams.get("band") || undefined;
  return NextResponse.json({ prospects: await listProspects({ status, band }) });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const input = body as {
    name?: unknown;
    website?: unknown;
    location?: unknown;
  };
  const cleaned = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    website: typeof input.website === "string" ? input.website.trim() : "",
    location: typeof input.location === "string" ? input.location.trim() : "",
  };
  if (!hasAnyField(cleaned)) {
    return NextResponse.json(
      { error: "fill at least one field: name, website, or location" },
      { status: 400 },
    );
  }
  if (cleaned.website && !/^https?:\/\//i.test(cleaned.website)) {
    return NextResponse.json(
      { error: "website must start with http:// or https://" },
      { status: 400 },
    );
  }
  const prospect = await createProspect({
    name: prospectLabel(cleaned),
    website: cleaned.website || null,
    location: cleaned.location || null,
  });
  return NextResponse.json({ prospect }, { status: 201 });
}
