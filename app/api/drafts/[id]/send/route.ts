import { NextResponse } from "next/server";
import { getDraft } from "@/lib/db";
import { sendDraftEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Manual send — human clicks Send on an approved email draft.
 *  Caps and one-email-per-prospect still apply; only the approval
 *  gate is already behind us. */
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
  if (existing.channel !== "email") {
    return NextResponse.json(
      { error: "only email drafts send from here — WhatsApp goes out by hand" },
      { status: 400 },
    );
  }
  try {
    const { draft, send } = await sendDraftEmail(draftId, { auto: false });
    return NextResponse.json({ draft, send });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send failed";
    const status = msg.includes("already sent") || msg.includes("not approved")
      ? 409
      : msg.includes("cap reached")
        ? 429
        : msg.includes("RESEND_API_KEY")
          ? 503
          : msg.includes("Resend failed")
            ? 502
            : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
