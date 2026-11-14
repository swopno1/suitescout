import { NextResponse } from "next/server";
import {
  createQuote,
  getPriceRule,
  getProspect,
  listPriceItems,
  recordAdminAction,
} from "@/lib/db";
import { QuoteError, buildQuoteLines } from "@/lib/quotes";
import type { QuoteMarket } from "@/lib/types";

export const dynamic = "force-dynamic";

function actor(): string | null {
  return process.env.APP_USER?.trim() || null;
}

const MARKETS: QuoteMarket[] = ["intl-sub", "bd-onetime", "bd-modelb"];

/** Build a draft quote. Totals computed server-side from price_items
 *  only — the client sends selections, never figures. */
export async function POST(req: Request) {
  const who = actor();
  if (!who) {
    return NextResponse.json(
      { error: "Server login is not configured." },
      { status: 503 },
    );
  }
  let body: {
    customerName?: unknown;
    prospectId?: unknown;
    market?: unknown;
    items?: unknown;
    hostingKey?: unknown;
    domainLabel?: unknown;
    domainAmountMinor?: unknown;
    domainCurrency?: unknown;
    chatbotTier?: unknown;
    notes?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    if (
      typeof body.customerName !== "string" ||
      body.customerName.trim().length === 0
    ) {
      throw new QuoteError(400, "Name the customer (or pick a prospect).");
    }
    if (
      typeof body.market !== "string" ||
      !(MARKETS as string[]).includes(body.market)
    ) {
      throw new QuoteError(400, "Pick a market.");
    }
    if (
      !Array.isArray(body.items) ||
      !body.items.every((i): i is string => typeof i === "string")
    ) {
      throw new QuoteError(400, "Pick at least one item.");
    }
    const prospectId =
      typeof body.prospectId === "number" ? body.prospectId : null;
    if (prospectId !== null && !(await getProspect(prospectId))) {
      throw new QuoteError(400, "No such prospect.");
    }
    const [items, modelbShare] = await Promise.all([
      listPriceItems(),
      getPriceRule("modelb_revenue_share_pct"),
    ]);
    const built = buildQuoteLines(
      {
        market: body.market as QuoteMarket,
        items: body.items,
        hostingKey:
          typeof body.hostingKey === "string" && body.hostingKey
            ? body.hostingKey
            : null,
        domainLabel:
          typeof body.domainLabel === "string" && body.domainLabel.trim()
            ? body.domainLabel.trim()
            : null,
        domainAmountMinor:
          typeof body.domainAmountMinor === "number"
            ? body.domainAmountMinor
            : null,
        domainCurrency:
          body.domainCurrency === "USD" || body.domainCurrency === "BDT"
            ? body.domainCurrency
            : null,
        chatbotTier:
          typeof body.chatbotTier === "string" && body.chatbotTier
            ? body.chatbotTier
            : null,
      },
      items,
      modelbShare ?? "5",
    );
    const quote = await createQuote({
      customerName: body.customerName.trim(),
      prospectId,
      market: body.market as QuoteMarket,
      items: body.items,
      hostingKey:
        typeof body.hostingKey === "string" && body.hostingKey
          ? body.hostingKey
          : null,
      domainLabel:
        typeof body.domainLabel === "string" && body.domainLabel.trim()
          ? body.domainLabel.trim()
          : null,
      domainAmountMinor:
        typeof body.domainAmountMinor === "number"
          ? body.domainAmountMinor
          : null,
      domainCurrency:
        body.domainCurrency === "USD" || body.domainCurrency === "BDT"
          ? body.domainCurrency
          : null,
      chatbotTier:
        typeof body.chatbotTier === "string" && body.chatbotTier
          ? body.chatbotTier
          : null,
      lines: built.lines,
      totalOnetimeMinor: built.totalOnetimeMinor,
      totalMonthlyMinor: built.totalMonthlyMinor,
      currency: built.currency,
      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
    });
    await recordAdminAction({
      actor: who,
      action: "quote.create",
      targetType: "quote",
      targetId: String(quote.id),
      before: {},
      after: quote as unknown as Record<string, unknown>,
      reason: `Draft ${quote.market} quote for ${quote.customer_name}`,
    });
    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    if (e instanceof QuoteError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
