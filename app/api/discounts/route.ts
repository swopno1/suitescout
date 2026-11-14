import { NextResponse } from "next/server";
import {
  createDiscount,
  getPriceItem,
  getQuote,
  listOpenDiscountsForProduct,
  recordAdminAction,
} from "@/lib/db";
import {
  DiscountError,
  assertNoStacking,
  evaluateDiscountRequest,
} from "@/lib/discounts";
import type { Discount } from "@/lib/types";

export const dynamic = "force-dynamic";

function actor(): string | null {
  return process.env.APP_USER?.trim() || null;
}

const TARGETS: Discount["target_type"][] = [
  "quote",
  "subscription",
  "hosting",
];

/**
 * Request a discount. List/floor resolve server-side:
 * - quote/hosting targets: the quote's LOCKED line figure + the
 *   product's current floor from price_items.
 * - subscription targets (Rail A): the chatbot tier figure is read
 *   at apply time; the request carries no list, so it always takes
 *   the explicit-approval path.
 */
export async function POST(req: Request) {
  const who = actor();
  if (!who) {
    return NextResponse.json(
      { error: "Server login is not configured." },
      { status: 503 },
    );
  }
  let body: {
    targetType?: unknown;
    targetId?: unknown;
    customerLabel?: unknown;
    product?: unknown;
    kind?: unknown;
    value?: unknown;
    currency?: unknown;
    durationKind?: unknown;
    durationMonths?: unknown;
    reason?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    if (
      typeof body.targetType !== "string" ||
      !(TARGETS as string[]).includes(body.targetType)
    ) {
      throw new DiscountError(400, "Pick a target (quote, subscription, hosting).");
    }
    const targetType = body.targetType as Discount["target_type"];
    if (typeof body.targetId !== "string" || !body.targetId.trim()) {
      throw new DiscountError(400, "Pick a target.");
    }
    const targetId = body.targetId.trim();
    if (
      typeof body.customerLabel !== "string" ||
      !body.customerLabel.trim()
    ) {
      throw new DiscountError(400, "Name the customer.");
    }
    if (typeof body.product !== "string" || !body.product.trim()) {
      throw new DiscountError(400, "Pick a product.");
    }
    const product = body.product.trim();
    if (body.kind !== "percent" && body.kind !== "fixed") {
      throw new DiscountError(400, "Pick percent or fixed.");
    }
    if (
      body.durationKind !== "once" &&
      body.durationKind !== "ongoing" &&
      body.durationKind !== "months"
    ) {
      throw new DiscountError(400, "Pick a duration.");
    }

    // Resolve list + floor.
    let listMinor: number | null = null;
    let floorMinor: number | null = null;
    if (targetType === "subscription") {
      if (product !== "concierge-subscription") {
        throw new DiscountError(
          400,
          "Subscription discounts apply to the concierge subscription only.",
        );
      }
      // No list/floor verifiable at request time → explicit path.
    } else {
      const quoteId = Number(targetId);
      if (!Number.isInteger(quoteId)) {
        throw new DiscountError(400, "Pick a quote.");
      }
      const quote = await getQuote(quoteId);
      if (!quote) throw new DiscountError(400, "No such quote.");
      if (targetType === "hosting" && product !== quote.hosting_key) {
        throw new DiscountError(
          400,
          "Hosting discounts apply to the quote's hosting line.",
        );
      }
      const line = quote.lines.find(
        (l) => l.key === product && l.unit_minor !== null,
      );
      if (!line || line.unit_minor === null) {
        throw new DiscountError(
          400,
          "That product is not a priced line on this quote.",
        );
      }
      listMinor = line.unit_minor;
      if (body.kind === "fixed" && body.currency !== quote.currency) {
        throw new DiscountError(
          400,
          `Fixed discounts on this quote must be in ${quote.currency}.`,
        );
      }
      const item = await getPriceItem(product);
      floorMinor = item?.bd_floor_poisha ?? null;
    }
    if (body.kind === "fixed" && targetType === "subscription" && body.currency !== "USD") {
      throw new DiscountError(
        400,
        "Subscription discounts are in USD (Stripe billing).",
      );
    }

    const valid = evaluateDiscountRequest(
      {
        targetType,
        targetId,
        customerLabel: body.customerLabel.trim(),
        product,
        kind: body.kind,
        value: body.value as number,
        currency:
          body.currency === "USD" || body.currency === "BDT"
            ? body.currency
            : null,
        durationKind: body.durationKind,
        durationMonths:
          typeof body.durationMonths === "number"
            ? body.durationMonths
            : null,
        reason: body.reason as string,
      },
      listMinor,
      floorMinor,
    );
    assertNoStacking(
      await listOpenDiscountsForProduct(targetType, targetId, product),
      null,
    );
    const discount = await createDiscount({
      targetType,
      targetId,
      customerLabel: (body.customerLabel as string).trim(),
      product,
      kind: valid.kind,
      valueMinor: valid.valueMinor,
      currency: valid.currency,
      durationKind: body.durationKind,
      durationMonths: valid.durationMonths,
      reason: (body.reason as string).trim(),
      belowFloor: valid.belowFloor,
    });
    await recordAdminAction({
      actor: who,
      action: "discount.request",
      targetType: `discount-${targetType}`,
      targetId: String(discount.id),
      before: {},
      after: {
        ...(discount as unknown as Record<string, unknown>),
        listMinor,
        floorMinor,
        resultMinor: valid.resultMinor,
      },
      reason: discount.reason,
    });
    return NextResponse.json({ ok: true, discount, listMinor, floorMinor });
  } catch (e) {
    if (e instanceof DiscountError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
