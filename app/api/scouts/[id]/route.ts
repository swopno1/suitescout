import { NextResponse } from "next/server";
import { getScout, listProspectsByIds } from "@/lib/db";

export const dynamic = "force-dynamic";

/** One scout with its imported prospects (for the live view). */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const scoutId = Number(id);
  if (!Number.isFinite(scoutId)) {
    return NextResponse.json({ error: "invalid scout id" }, { status: 400 });
  }
  const scout = await getScout(scoutId);
  if (!scout) {
    return NextResponse.json({ error: "scout not found" }, { status: 404 });
  }
  const prospects = await listProspectsByIds(scout.prospect_ids);
  return NextResponse.json({ scout, prospects });
}
