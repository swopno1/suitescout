// S4 Rail A — Stripe coupons from approved discounts. Coupons ONLY:
// this module never creates price objects and never edits plan
// prices — Concierge subscription prices live in Stripe, deliberately.
// Key: STRIPE_SECRET_KEY (founder-provisioned, restricted to coupons
// + subscriptions). Unset → every apply reports "not configured"
// and the discount stays Approved (fail-soft; Rail B unaffected).
import Stripe from "stripe";
import type { Discount } from "./types";

let client: Stripe | null = null;
let clientForKey: string | null = null;

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe rail not configured.");
  if (!client || clientForKey !== key) {
    client = new Stripe(key);
    clientForKey = key;
  }
  return client;
}

export interface StripeApplyResult {
  couponId: string;
  subscriptionId: string;
}

/** Create-once coupon + attach to the subscription. Returns Stripe's
 *  ids for the discount record. Throws on any Stripe failure — the
 *  caller keeps the discount Approved-not-Applied with the message. */
export async function applyCouponToSubscription(
  discount: Discount,
  stripeSubscriptionId: string,
): Promise<StripeApplyResult> {
  const s = stripe();
  const idempotencyKey = `discount-${discount.id}`;
  const coupon = await s.coupons.create(
    {
      ...(discount.kind === "percent"
        ? { percent_off: discount.value_minor }
        : {
            amount_off: discount.value_minor,
            currency: (discount.currency ?? "USD").toLowerCase(),
          }),
      ...(discount.duration_kind === "once"
        ? { duration: "once" }
        : discount.duration_kind === "ongoing"
          ? { duration: "forever" }
          : {
              duration: "repeating",
              duration_in_months: discount.duration_months ?? 1,
            }),
      name: `Console discount #${discount.id} (${discount.customer_label})`.slice(0, 40),
      metadata: {
        console_discount_id: String(discount.id),
        product: discount.product,
      },
    },
    { idempotencyKey: `${idempotencyKey}-coupon` },
  );
  await s.subscriptions.update(
    stripeSubscriptionId,
    { discounts: [{ coupon: coupon.id }] },
    { idempotencyKey: `${idempotencyKey}-attach` },
  );
  return { couponId: coupon.id, subscriptionId: stripeSubscriptionId };
}
