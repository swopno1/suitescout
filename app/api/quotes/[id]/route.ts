import { NextResponse } from "next/server";
import {
  getPriceRule,
  getQuote,
  recordAdminAction,
  updateQuoteState,
} from "@/lib/db";
import { QuoteError, transitionQuote } from "@/lib/quotes";
import type { QuoteState } from "@/lib/types";

export const dynamic = "force-dynamic";

function actor(): string | null {
  return process.env.APP_USER?.trim() || null;
}

const STATES: QuoteState[] = ["sent", "accepted", "declined", "expired"];

/** Move a draft/sent quote along its state machine. Sending a BD
 *  quote stamps the 7-day validity from price_rules. */
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
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const quote = await getQuote(id);
  if (!quote) {
    return NextResponse.json({ error: "No such quote." }, { status: 404 });
  }
  let body: { to?: unknown; note?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    if (typeof body.to !== "string" || !(STATES as string[]).includes(body.to)) {
      throw new QuoteError(400, "Pick a valid next state.");
    }
    const to = body.to as QuoteState;
    const now = new Date();
    transitionQuote(quote.state, to, quote.valid_until, now);
    let validUntil = quote.valid_until;
    if (to === "sent" && quote.market !== "intl-sub") {
      const days = Number(
        (await getPriceRule("bd_quote_validity_days")) ?? "7",
      );
      validUntil = new Date(
        now.getTime() + days * 86_400_000,
      ).toISOString();
    }
    const after = await updateQuoteState(id, to, validUntil);
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : `Quote ${quote.state} → ${to}`;
    await recordAdminAction({
      actor: who,
      action: "quote.transition",
      targetType: "quote",
      targetId: String(id),
      before: { state: quote.state, valid_until: quote.valid_until },
      after: { state: to, valid_until: validUntil },
      reason: note,
    });
    return NextResponse.json({ ok: true, quote: after });
  } catch (e) {
    if (e instanceof QuoteError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
