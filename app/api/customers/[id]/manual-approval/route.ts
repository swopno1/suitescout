import { NextResponse } from "next/server";
import { ActionError, applyManualApproval } from "@/lib/concierge-write";

export const dynamic = "force-dynamic";

function actor(): string | null {
  return process.env.APP_USER?.trim() || null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const who = actor();
  if (!who) {
    return NextResponse.json(
      { error: "Server login is not configured." },
      { status: 503 },
    );
  }
  const { id } = await params;
  let body: {
    plan?: unknown;
    periodEnd?: unknown;
    reference?: unknown;
    reason?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const { before, after } = await applyManualApproval({
      propertyId: id,
      approval: {
        plan: body.plan,
        periodEnd: body.periodEnd,
        reference: body.reference,
        reason: body.reason,
      },
      actor: who,
    });
    return NextResponse.json({ ok: true, before, after });
  } catch (e) {
    if (e instanceof ActionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
