import { NextResponse } from "next/server";
import {
  getDiscount,
  listOpenDiscountsForProduct,
  recordAdminAction,
  updateDiscount,
} from "@/lib/db";
import { getCustomer } from "@/lib/concierge-db";
import { DiscountError, assertNoStacking } from "@/lib/discounts";
import {
  applyCouponToSubscription,
  stripeConfigured,
} from "@/lib/stripe-rail";

export const dynamic = "force-dynamic";

function actor(): string | null {
  return process.env.APP_USER?.trim() || null;
}

type Action = "approve" | "deny" | "apply" | "expire";

async function audit(
  who: string,
  action: string,
  id: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  reason: string,
) {
  await recordAdminAction({
    actor: who,
    action,
    targetType: "discount",
    targetId: String(id),
    before,
    after,
    reason,
  });
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
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const discount = await getDiscount(id);
  if (!discount) {
    return NextResponse.json({ error: "No such discount." }, { status: 404 });
  }
  let body: {
    action?: unknown;
    manualReason?: unknown;
    note?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const action = body.action as Action;
    if (!["approve", "deny", "apply", "expire"].includes(action)) {
      throw new DiscountError(400, "Pick approve, deny, apply or expire.");
    }

    if (action === "approve") {
      if (discount.state !== "requested") {
        throw new DiscountError(409, "Only requested discounts approve.");
      }
      // Below the floor: explicit manual approval with a WRITTEN
      // reason. At/above: one tap.
      let reason = `Approved by ${who}`;
      if (discount.below_floor) {
        if (
          typeof body.manualReason !== "string" ||
          body.manualReason.trim().length < 3
        ) {
          throw new DiscountError(
            400,
            "Below the floor: write the manual-approval reason (min 3 characters).",
          );
        }
        reason = `Manual below-floor approval by ${who}: ${body.manualReason.trim()}`;
      }
      assertNoStacking(
        await listOpenDiscountsForProduct(
          discount.target_type,
          discount.target_id,
          discount.product,
        ),
        discount.id,
      );
      const after = await updateDiscount(discount.id, {
        state: "approved",
        approved_by: who,
        approved_at: new Date().toISOString(),
      });
      await audit(who, "discount.approve", id, { state: "requested" }, { state: "approved" }, reason);
      return NextResponse.json({ ok: true, discount: after });
    }

    if (action === "deny") {
      if (discount.state !== "requested") {
        throw new DiscountError(409, "Only requested discounts deny.");
      }
      const note =
        typeof body.note === "string" && body.note.trim()
          ? body.note.trim()
          : "Denied.";
      const after = await updateDiscount(discount.id, { state: "denied" });
      await audit(who, "discount.deny", id, { state: "requested" }, { state: "denied" }, note);
      return NextResponse.json({ ok: true, discount: after });
    }

    if (action === "apply") {
      if (discount.state !== "approved") {
        throw new DiscountError(409, "Only approved discounts apply.");
      }
      if (discount.target_type === "subscription") {
        // Rail A: Stripe coupon onto the live subscription.
        if (!stripeConfigured()) {
          throw new DiscountError(
            503,
            "Stripe rail not configured — set STRIPE_SECRET_KEY on the server. The discount stays approved.",
          );
        }
        const customer = await getCustomer(discount.target_id);
        const subId =
          customer.status === "ok"
            ? customer.data?.stripeSubscriptionId ?? null
            : null;
        if (!subId) {
          const msg =
            customer.status === "ok"
              ? "That property has no Stripe subscription to discount."
              : "Concierge link unavailable — cannot resolve the subscription. The discount stays approved.";
          await updateDiscount(discount.id, { last_error: msg });
          throw new DiscountError(503, msg);
        }
        try {
          const { couponId, subscriptionId } =
            await applyCouponToSubscription(discount, subId);
          const after = await updateDiscount(discount.id, {
            state: "applied",
            applied_at: new Date().toISOString(),
            stripe_coupon_id: couponId,
            stripe_subscription_id: subscriptionId,
            last_error: null,
          });
          await audit(
            who,
            "discount.apply",
            id,
            { state: "approved" },
            { state: "applied", couponId, subscriptionId },
            `Rail A: coupon ${couponId} on ${subscriptionId}`,
          );
          return NextResponse.json({ ok: true, discount: after });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await updateDiscount(discount.id, { last_error: msg });
          await audit(
            who,
            "discount.apply-failed",
            id,
            { state: "approved" },
            { state: "approved", error: msg },
            `Rail A failed, stays approved: ${msg}`,
          );
          throw new DiscountError(502, `Stripe said no: ${msg}`);
        }
      }
      // Rail B: the discount materialises on the quote (and, once S5
      // lands, on the invoice from this same record).
      const after = await updateDiscount(discount.id, {
        state: "applied",
        applied_at: new Date().toISOString(),
      });
      await audit(
        who,
        "discount.apply",
        id,
        { state: "approved" },
        { state: "applied" },
        "Rail B: live on the quote (S5 invoices from this record).",
      );
      return NextResponse.json({ ok: true, discount: after });
    }

    // expire
    if (discount.state !== "applied" && discount.state !== "approved") {
      throw new DiscountError(409, "Only applied or approved discounts expire.");
    }
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : "Expired.";
    const after = await updateDiscount(discount.id, { state: "expired" });
    await audit(
      who,
      "discount.expire",
      id,
      { state: discount.state },
      { state: "expired" },
      note,
    );
    return NextResponse.json({ ok: true, discount: after });
  } catch (e) {
    if (e instanceof DiscountError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
