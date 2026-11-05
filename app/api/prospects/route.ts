import { NextRequest, NextResponse } from "next/server";
import { createProspect, listProspects } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const band = req.nextUrl.searchParams.get("band") || undefined;
  return NextResponse.json({ prospects: listProspects({ status, band }) });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { name?: unknown }).name !== "string" ||
    !(body as { name: string }).name.trim()
  ) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const input = body as {
    name: string;
    website?: string | null;
    location?: string | null;
  };
  const prospect = createProspect({
    name: input.name,
    website: input.website ?? null,
    location: input.location ?? null,
  });
  return NextResponse.json({ prospect }, { status: 201 });
}
