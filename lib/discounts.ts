// S4 discount math — pure leaf (types only), unit-tested: floor
// evaluation, no-stacking, duration/expiry derivation, board rollup.
import type { Discount, PriceItem } from "./types";

export class DiscountError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "DiscountError";
    this.status = status;
  }
}

export interface DiscountRequestInput {
  targetType: Discount["target_type"];
  targetId: string;
  customerLabel: string;
  product: string;
  kind: Discount["kind"];
  /** Percent: whole percent 1–100. Fixed: major units (dollars/taka). */
  value: number;
  currency: "USD" | "BDT" | null;
  durationKind: Discount["duration_kind"];
  durationMonths: number | null;
  reason: string;
}

export interface ValidDiscountRequest {
  kind: Discount["kind"];
  valueMinor: number;
  currency: "USD" | "BDT" | null;
  durationMonths: number | null;
  /** List, floor and resulting figure — shown before confirming. */
  listMinor: number | null;
  floorMinor: number | null;
  resultMinor: number | null;
  belowFloor: boolean;
}

/**
 * Validate a discount request + evaluate the floor rule.
 *
 * listMinor is the product's current list figure in the discount
 * currency (caller resolves: quote-line figure, hosting figure, or
 * chatbot-tier figure). Null list = unpriced product (quoted
 * individually): any discount needs explicit approval.
 *
 * Below the floor (or no floor/list to check against) → belowFloor,
 * which forces the explicit manual-approval path with a written
 * reason. At/above the floor → one-tap approval.
 */
export function evaluateDiscountRequest(
  input: DiscountRequestInput,
  listMinor: number | null,
  floorMinor: number | null,
): ValidDiscountRequest {
  if (!Number.isFinite(input.value) || input.value <= 0) {
    throw new DiscountError(400, "The discount value must be above zero.");
  }
  let valueMinor: number;
  let resultMinor: number | null = null;
  if (input.kind === "percent") {
    if (!Number.isInteger(input.value) || input.value > 100) {
      throw new DiscountError(
        400,
        "Percent discounts are whole percent, 1–100.",
      );
    }
    valueMinor = input.value;
    if (listMinor !== null) {
      resultMinor = Math.round((listMinor * (100 - input.value)) / 100);
    }
  } else {
    if (input.currency !== "USD" && input.currency !== "BDT") {
      throw new DiscountError(
        400,
        "Fixed discounts need a currency (USD/BDT).",
      );
    }
    valueMinor = Math.round(input.value * 100);
    if (listMinor !== null) resultMinor = listMinor - valueMinor;
  }
  if (resultMinor !== null && resultMinor < 0) {
    throw new DiscountError(
      400,
      "The discount is larger than the list figure.",
    );
  }
  if (input.durationKind === "months") {
    if (
      !Number.isInteger(input.durationMonths) ||
      (input.durationMonths as number) < 1 ||
      (input.durationMonths as number) > 36
    ) {
      throw new DiscountError(
        400,
        "Month durations run 1–36 months.",
      );
    }
  }
  if (typeof input.reason !== "string" || input.reason.trim().length === 0) {
    throw new DiscountError(400, "A reason is required.");
  }
  // No list or no floor to verify against → the explicit path.
  const belowFloor =
    resultMinor === null ||
    floorMinor === null ||
    resultMinor < floorMinor;
  return {
    kind: input.kind,
    valueMinor,
    currency: input.kind === "fixed" ? input.currency : null,
    durationMonths:
      input.durationKind === "months" ? (input.durationMonths as number) : null,
    listMinor,
    floorMinor,
    resultMinor,
    belowFloor,
  };
}

/** Duration derivation (no cron): months-N is live until applied_at +
 *  N months; once/ongoing stay until consumed/ended explicitly. */
export function discountActive(d: Discount, now: Date): boolean {
  if (d.state !== "applied") return false;
  if (d.consumed_at) return false;
  if (
    d.duration_kind === "months" &&
    d.applied_at &&
    d.duration_months
  ) {
    const end =
      new Date(d.applied_at).getTime() + d.duration_months * 30 * 86_400_000;
    if (now.getTime() > end) return false;
  }
  return true;
}

/** Past its months window but still 'applied' — display only; the
 *  explicit 'expired' transition writes the audit row. */
export function discountExpiryDue(d: Discount, now: Date): boolean {
  return (
    d.state === "applied" &&
    d.duration_kind === "months" &&
    !!d.applied_at &&
    !!d.duration_months &&
    now.getTime() >
      new Date(d.applied_at).getTime() + d.duration_months * 30 * 86_400_000
  );
}

/** No stacking: one open row per target+product. Throws 409 naming
 *  the existing row. */
export function assertNoStacking(
  open: Discount[],
  selfId: number | null,
): void {
  const clash = open.find((d) => d.id !== selfId);
  if (clash) {
    throw new DiscountError(
      409,
      `One active discount per customer per product — #${clash.id} (${clash.state}) already covers this. Deny or expire it first.`,
    );
  }
}

/** Board rollup: active count + this month's discounted amount.
 *  Fixed discounts applied this month are exact per currency;
 *  percent discounts estimate against the CURRENT list figure and
 *  are marked approximate (list may have moved since). Products
 *  without a resolvable list are counted, not valued. */
export interface DiscountedAmount {
  activeCount: number;
  /** Exact fixed-value discounts applied this month, per currency. */
  fixedByCurrency: { currency: "USD" | "BDT"; minor: number }[];
  /** Estimated percent-based discounts applied this month. */
  percentEstimateMinor: number;
  percentEstimateCurrency: "USD" | "BDT" | null;
  percentCount: number;
  unvaluedCount: number;
}

export function boardDiscountRollup(
  discounts: Discount[],
  listOf: (d: Discount) => { minor: number; currency: "USD" | "BDT" } | null,
  now: Date,
): DiscountedAmount {
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).getTime();
  let activeCount = 0;
  const fixed = new Map<"USD" | "BDT", number>();
  let percentEstimateMinor = 0;
  let percentEstimateCurrency: "USD" | "BDT" | null = null;
  let percentCount = 0;
  let unvaluedCount = 0;
  for (const d of discounts) {
    if (discountActive(d, now)) activeCount++;
    if (
      d.state !== "applied" ||
      !d.applied_at ||
      new Date(d.applied_at).getTime() < monthStart
    ) {
      continue;
    }
    if (d.kind === "fixed" && d.currency) {
      fixed.set(d.currency, (fixed.get(d.currency) ?? 0) + d.value_minor);
      continue;
    }
    if (d.kind === "percent") {
      const list = listOf(d);
      if (!list) {
        unvaluedCount++;
        continue;
      }
      percentCount++;
      // Single-currency ledgers in practice; mixed currencies keep
      // the first and count the rest as unvalued rather than invent
      // an exchange rate.
      if (
        percentEstimateCurrency &&
        percentEstimateCurrency !== list.currency
      ) {
        unvaluedCount++;
        percentCount--;
        continue;
      }
      percentEstimateCurrency = list.currency;
      percentEstimateMinor += Math.round((list.minor * d.value_minor) / 100);
      continue;
    }
    unvaluedCount++;
  }
  return {
    activeCount,
    fixedByCurrency: [...fixed.entries()].map(([currency, minor]) => ({
      currency,
      minor,
    })),
    percentEstimateMinor,
    percentEstimateCurrency,
    percentCount,
    unvaluedCount,
  };
}

/** Resolve a discount's list figure: price_items for Suite products,
 *  chatbot-tier rows for rail-A subscription discounts. */
export function discountListFigure(
  d: Discount,
  items: PriceItem[],
  chatbotTierOfProperty: (propertyId: string) => string | null,
): { minor: number; currency: "USD" | "BDT" } | null {
  if (d.product === "concierge-subscription") {
    const tier = chatbotTierOfProperty(d.target_id);
    const row = items.find(
      (i) => i.group === "chatbot" && i.key === `chatbot-${tier?.toLowerCase()}`,
    );
    if (!row || row.intl_monthly_cents === null) return null;
    return { minor: row.intl_monthly_cents, currency: "USD" };
  }
  const row = items.find((i) => i.key === d.product);
  if (!row) return null;
  if (row.bd_onetime_poisha !== null) {
    return { minor: row.bd_onetime_poisha, currency: "BDT" };
  }
  if (row.intl_monthly_cents !== null) {
    return { minor: row.intl_monthly_cents, currency: "USD" };
  }
  if (row.bd_monthly_poisha !== null) {
    return { minor: row.bd_monthly_poisha, currency: "BDT" };
  }
  return null;
}
