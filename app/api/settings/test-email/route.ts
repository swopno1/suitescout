import { NextRequest, NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Owner-only deliverability check: one test email proving the key
 *  and the verified domain before real outreach goes out. */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const to = (body as { to?: unknown } | null)?.to;
  if (typeof to !== "string" || !to.trim()) {
    return NextResponse.json(
      { error: "to (an email address) is required" },
      { status: 400 },
    );
  }
  try {
    const { id } = await sendTestEmail(to);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "test send failed";
    const status = msg.includes("RESEND_API_KEY")
      ? 503
      : msg.includes("valid email")
        ? 400
        : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
