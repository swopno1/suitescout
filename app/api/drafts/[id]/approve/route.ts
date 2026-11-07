import { NextRequest, NextResponse } from "next/server";
import { approveDraft, getDraft } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Human gate — approves a draft so it can be sent. The agent never sends. */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const draftId = Number(id);
  if (!Number.isFinite(draftId)) {
    return NextResponse.json({ error: "invalid draft id" }, { status: 400 });
  }
  const existing = await getDraft(draftId);
  if (!existing) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: `draft is already ${existing.status}`, draft: existing },
      { status: 409 },
    );
  }
  const draft = await approveDraft(draftId);
  return NextResponse.json({ draft });
}
