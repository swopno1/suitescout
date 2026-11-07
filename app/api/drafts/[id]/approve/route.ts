import { NextRequest, NextResponse } from "next/server";
import { approveDraft, getDraft, getProspect } from "@/lib/db";
import { qualifiesForAutoSend } from "@/lib/evaluate";
import { autoSendEnabled, sendDraftEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Human gate — approves a draft so it can be sent. The agent never
 *  sends. When the kill switch is on and the lead qualifies, the
 *  approved email goes out immediately — the approval IS the human
 *  gate, so "a human approves every send" stays literally true. */
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
  await approveDraft(draftId);
  const draft = await getDraft(draftId);

  let auto: { sent: boolean; reason: string | null } | null = null;
  if (draft && draft.channel === "email" && autoSendEnabled()) {
    const prospect = await getProspect(draft.prospect_id);
    if (prospect) {
      const q = qualifiesForAutoSend(prospect, draft);
      if (q.ok) {
        try {
          await sendDraftEmail(draftId, { auto: true });
          auto = { sent: true, reason: null };
        } catch (err) {
          auto = {
            sent: false,
            reason: err instanceof Error ? err.message : "auto-send failed",
          };
        }
      } else {
        auto = { sent: false, reason: q.reasons.join("; ") };
      }
    }
  }
  return NextResponse.json({ draft: await getDraft(draftId), auto });
}
