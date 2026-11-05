import { NextRequest, NextResponse } from "next/server";
import { updateProspectStatus } from "@/lib/db";
import { PROSPECT_STATUSES, type ProspectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const prospectId = Number(id);
  if (!Number.isFinite(prospectId)) {
    return NextResponse.json({ error: "invalid prospect id" }, { status: 400 });
  }
  const body: unknown = await req.json().catch(() => null);
  const status = (body as { status?: unknown } | null)?.status;
  if (
    typeof status !== "string" ||
    !(PROSPECT_STATUSES as string[]).includes(status)
  ) {
    return NextResponse.json(
      { error: `status must be one of: ${PROSPECT_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  const prospect = updateProspectStatus(prospectId, status as ProspectStatus);
  if (!prospect) {
    return NextResponse.json({ error: "prospect not found" }, { status: 404 });
  }
  return NextResponse.json({ prospect });
}
