import { NextResponse } from "next/server";
import {
  getPriceItem,
  recordAdminAction,
  updatePriceItem,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function actor(): string | null {
  return process.env.APP_USER?.trim() || null;
}

function minor(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new Error("Prices are non-negative integers in minor units.");
  }
  return v;
}

/** Reprice / refloor / (de)activate one item. Names, groups, members
 *  and chatbot rows are not editable. Every edit is audited. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const who = actor();
  if (!who) {
    return NextResponse.json(
      { error: "Server login is not configured." },
      { status: 503 },
    );
  }
  const { key } = await params;
  const before = await getPriceItem(key);
  if (!before) {
    return NextResponse.json({ error: "No such price item." }, { status: 404 });
  }
  if (!before.editable) {
    return NextResponse.json(
      { error: "Chatbot tiers are locked in Stripe — display only here." },
      { status: 403 },
    );
  }
  let body: {
    intl_monthly_cents?: unknown;
    bd_onetime_poisha?: unknown;
    bd_monthly_poisha?: unknown;
    bd_floor_poisha?: unknown;
    active?: unknown;
    note?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  let patch: Parameters<typeof updatePriceItem>[1];
  try {
    patch = {
      intl_monthly_cents: minor(body.intl_monthly_cents),
      bd_onetime_poisha: minor(body.bd_onetime_poisha),
      bd_monthly_poisha: minor(body.bd_monthly_poisha),
      bd_floor_poisha: minor(body.bd_floor_poisha),
    };
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        throw new Error("active must be true or false.");
      }
      patch.active = body.active;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request." },
      { status: 400 },
    );
  }
  const after = await updatePriceItem(key, patch);
  if (!after) {
    return NextResponse.json({ error: "No such price item." }, { status: 404 });
  }
  const reason =
    typeof body.note === "string" && body.note.trim().length > 0
      ? body.note.trim()
      : "pricing update";
  await recordAdminAction({
    actor: who,
    action: "pricing.update",
    targetType: "price-item",
    targetId: key,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
    reason,
  });
  return NextResponse.json({ ok: true, item: after });
}
