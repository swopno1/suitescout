import { NextResponse } from "next/server";
import { getDraft, markDraftSent } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Human records an approved draft as sent (the send itself happens
 *  outside the app — there is no sender yet). Strict: only approved
 *  drafts move; anything else is a 409 with the current draft. */
export async function POST(
  _req: Request,
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
  if (existing.status !== "approved") {
    return NextResponse.json(
      { error: `only approved drafts can be marked sent (is ${existing.status})`, draft: existing },
      { status: 409 },
    );
  }
  const draft = await markDraftSent(draftId);
  return NextResponse.json({ draft });
}
