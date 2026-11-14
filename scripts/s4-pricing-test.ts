// S4 pricing test — v3 seed sums (transcription guard), quote math,
// state machines, floor rule, stacking, rollup. Pure, no database.
// Run: `node scripts/s4-pricing-test.ts` (Node 24 runs .ts directly).
// Exit code 1 on any failure.
import { V3_PRICE_ITEMS, V3_PRICE_RULES } from "../lib/price-seed.ts";
import {
  QuoteError,
  buildQuoteLines,
  isQuoteExpired,
  transitionQuote,
} from "../lib/quotes.ts";
import {
  DiscountError,
  assertNoStacking,
  boardDiscountRollup,
  discountActive,
  evaluateDiscountRequest,
} from "../lib/discounts.ts";
import type { Discount, PriceItem } from "../lib/types.ts";

let failures = 0;

function check(name: string, cond: boolean): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) failures++;
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const items = new Map(V3_PRICE_ITEMS.map((i) => [i.key, i]));
const bd = (key: string): number => items.get(key)?.bdOnetimePoisha as number;
const intl = (key: string): number =>
  items.get(key)?.intlMonthlyCents as number;

// ---- v3 transcription guards ----

check(
  "seed holds 20 items + 6 rules",
  V3_PRICE_ITEMS.length === 20 && V3_PRICE_RULES.length === 6,
);

check(
  "BD reconciliation: base+payments+frontdesk+housekeeping+pack+people+content = 11799300p",
  bd("base") +
    bd("mod-payments") +
    bd("mod-frontdesk") +
    bd("mod-housekeeping") +
    bd("pack-operations") +
    bd("mod-people") +
    bd("mod-content") ===
    11799300,
);

check(
  "intl Growth sums to $108 (bundle $99)",
  intl("base") + intl("mod-payments") + intl("mod-frontdesk") + intl("mod-content") === 10800 &&
    intl("bundle-growth") === 9900,
);

// NOTE: v3 §2 says Complete sums to $168, but its own module table
// sums to $178 (49+25+19+12+9+12+9+9+19+15). The seed keeps the
// APPROVED bundle figure ($159) and the per-module figures; the $168
// is flagged for the founder, not encoded. This test pins the seed's
// actual arithmetic so any resolution shows up as a diff.
check(
  "Complete members sum to $178 by the module table; bundle lists $159",
  (items.get("bundle-complete")?.members ?? []).reduce(
    (n, k) => n + intl(k),
    0,
  ) === 17800 && intl("bundle-complete") === 15900,
);

check(
  "Operations pack $29 vs $39 summed; BD 2499900p",
  intl("mod-roomservice") +
    intl("mod-inventory") +
    intl("mod-purchasing") +
    intl("mod-expenses") ===
    3900 &&
    intl("pack-operations") === 2900 &&
    bd("pack-operations") === 2499900,
);

check(
  "hosting tiers + chatbot tiers match v3",
  intl("hosting-shared") === 1900 &&
    intl("hosting-standard") === 4900 &&
    intl("hosting-power") === 8900 &&
    intl("chatbot-starter") === 1900 &&
    intl("chatbot-growth") === 4900 &&
    intl("chatbot-scale") === 11900,
);

const priceItems = V3_PRICE_ITEMS.map(
  (s, i): PriceItem => ({
    id: i + 1,
    key: s.key,
    name: s.name,
    group: s.group,
    intl_monthly_cents: s.intlMonthlyCents,
    bd_onetime_poisha: s.bdOnetimePoisha,
    bd_monthly_poisha: s.bdMonthlyPoisha,
    bd_floor_poisha: s.bdFloorPoisha,
    editable: s.editable,
    active: true,
    members: s.members,
    sort_order: s.sortOrder,
  }),
);

// ---- quote math ----

check(
  "BD acceptance shape: base+payments+shared totals from items only",
  (() => {
    const q = buildQuoteLines(
      {
        market: "bd-onetime",
        items: ["base", "mod-payments"],
        hostingKey: "hosting-shared",
        domainLabel: "resort.com",
        domainAmountMinor: 200000,
        domainCurrency: "BDT",
        chatbotTier: null,
      },
      priceItems,
      "5",
    );
    return (
      q.currency === "BDT" &&
      q.totalOnetimeMinor === 2499900 + 1499900 + 200000 &&
      q.totalMonthlyMinor === 149900
    );
  })(),
);

check(
  "intl Growth bundle + shared + chatbot growth",
  (() => {
    const q = buildQuoteLines(
      {
        market: "intl-sub",
        items: ["bundle-growth"],
        hostingKey: "hosting-shared",
        domainLabel: null,
        domainAmountMinor: null,
        domainCurrency: null,
        chatbotTier: "GROWTH",
      },
      priceItems,
      "5",
    );
    return (
      q.totalOnetimeMinor === null &&
      q.totalMonthlyMinor === 9900 + 1900 + 4900
    );
  })(),
);

check(
  "Model B carries the 5% note line with no figure",
  (() => {
    const q = buildQuoteLines(
      {
        market: "bd-modelb",
        items: ["base"],
        hostingKey: null,
        domainLabel: null,
        domainAmountMinor: null,
        domainCurrency: null,
        chatbotTier: null,
      },
      priceItems,
      "5",
    );
    const note = q.lines.find((l) => l.key === "modelb-share");
    return (
      note?.kind === "note" &&
      note.unit_minor === null &&
      (note.name.includes("5%") ?? false) &&
      q.totalOnetimeMinor === 2499900
    );
  })(),
);

function expectQuoteThrow(name: string, fn: () => void, match: RegExp): void {
  try {
    fn();
    check(name, false);
  } catch (e) {
    check(name, e instanceof QuoteError && match.test(e.message));
  }
}

const baseInput = {
  market: "bd-onetime" as const,
  items: ["base"],
  hostingKey: null,
  domainLabel: null,
  domainAmountMinor: null,
  domainCurrency: null,
  chatbotTier: null,
};

expectQuoteThrow(
  "bundle/member overlap rejected",
  () =>
    buildQuoteLines(
      { ...baseInput, items: ["bundle-growth", "base"] },
      priceItems,
      "5",
    ),
  /already includes/,
);

expectQuoteThrow(
  "unknown key rejected",
  () => buildQuoteLines({ ...baseInput, items: ["nope"] }, priceItems, "5"),
  /Unknown price item/,
);

expectQuoteThrow(
  "unpriced-for-market rejected (bundle on BD)",
  () =>
    buildQuoteLines(
      { ...baseInput, items: ["bundle-growth"] },
      priceItems,
      "5",
    ),
  /no one-time/,
);

expectQuoteThrow(
  "domain currency must match quote currency",
  () =>
    buildQuoteLines(
      {
        ...baseInput,
        domainLabel: "x.com",
        domainAmountMinor: 100,
        domainCurrency: "USD",
      },
      priceItems,
      "5",
    ),
  /must be in the quote currency/,
);

// ---- quote states ----

check(
  "draft→sent→accepted allowed; accepted terminal",
  (() => {
    transitionQuote("draft", "sent", null, new Date());
    transitionQuote("sent", "accepted", null, new Date());
    try {
      transitionQuote("accepted", "sent", null, new Date());
      return false;
    } catch {
      return true;
    }
  })(),
);

check(
  "accepting past valid_until refused",
  (() => {
    try {
      transitionQuote("sent", "accepted", "2026-01-01T00:00:00.000Z", new Date());
      return false;
    } catch {
      return (
        isQuoteExpired("sent", "2020-01-01T00:00:00.000Z", new Date()) === true &&
        isQuoteExpired("sent", null, new Date()) === false
      );
    }
  })(),
);

// ---- floor rule ----

const reqBase = {
  targetType: "quote" as const,
  targetId: "1",
  customerLabel: "Test Resort",
  product: "base",
  kind: "percent" as const,
  value: 10,
  currency: null,
  durationKind: "once" as const,
  durationMonths: null,
  reason: "Founding-season goodwill",
};

check(
  "10% off base BD: result 2249910p ≥ floor 1999900p → one-tap",
  (() => {
    const v = evaluateDiscountRequest(reqBase, 2499900, 1999900);
    return v.resultMinor === 2249910 && v.belowFloor === false;
  })(),
);

check(
  "25% off base BD: result 1874925p < floor → explicit path",
  (() => {
    const v = evaluateDiscountRequest({ ...reqBase, value: 25 }, 2499900, 1999900);
    return v.resultMinor === 1874925 && v.belowFloor === true;
  })(),
);

check(
  "no floor on product → explicit path",
  evaluateDiscountRequest(reqBase, 2499900, null).belowFloor === true,
);

function expectDiscountThrow(name: string, fn: () => void, match: RegExp): void {
  try {
    fn();
    check(name, false);
  } catch (e) {
    check(name, e instanceof DiscountError && match.test(e.message));
  }
}

expectDiscountThrow(
  "fixed larger than list rejected",
  () =>
    evaluateDiscountRequest(
      { ...reqBase, kind: "fixed", value: 99999, currency: "BDT" },
      2499900,
      1999900,
    ),
  /larger than the list/,
);

expectDiscountThrow(
  "percent over 100 rejected",
  () => evaluateDiscountRequest({ ...reqBase, value: 101 }, 2499900, 1999900),
  /1–100/,
);

expectDiscountThrow(
  "months over 36 rejected",
  () =>
    evaluateDiscountRequest(
      { ...reqBase, durationKind: "months", durationMonths: 37 },
      2499900,
      1999900,
    ),
  /1–36/,
);

// ---- stacking + duration ----

function discount(over: Partial<Discount>): Discount {
  return {
    id: 1,
    created_at: "2026-11-14T00:00:00.000Z",
    updated_at: "2026-11-14T00:00:00.000Z",
    target_type: "quote",
    target_id: "1",
    customer_label: "Test",
    product: "base",
    kind: "percent",
    value_minor: 10,
    currency: null,
    duration_kind: "once",
    duration_months: null,
    reason: "r",
    state: "applied",
    below_floor: false,
    approved_by: "admin",
    approved_at: "2026-11-14T00:00:00.000Z",
    applied_at: "2026-11-14T00:00:00.000Z",
    consumed_at: null,
    stripe_coupon_id: null,
    stripe_subscription_id: null,
    last_error: null,
    ...over,
  };
}

check(
  "stacking: open row on same target+product clashes",
  (() => {
    try {
      assertNoStacking([discount({ id: 7 })], null);
      return false;
    } catch (e) {
      return e instanceof DiscountError && /#7/.test(e.message);
    }
  })() && (() => {
    assertNoStacking([discount({ id: 7 })], 7);
    assertNoStacking([], null);
    return true;
  })(),
);

check(
  "duration: once/ongoing active; consumed or months-lapsed inactive",
  discountActive(discount({}), new Date("2026-11-20T00:00:00Z")) === true &&
    discountActive(
      discount({ consumed_at: "2026-11-15T00:00:00.000Z" }),
      new Date("2026-11-20T00:00:00Z"),
    ) === false &&
    discountActive(
      discount({
        duration_kind: "months",
        duration_months: 1,
        applied_at: "2026-01-01T00:00:00.000Z",
      }),
      new Date("2026-11-20T00:00:00Z"),
    ) === false &&
    discountActive(
      discount({ state: "approved", applied_at: null }),
      new Date("2026-11-20T00:00:00Z"),
    ) === false,
);

// ---- board rollup ----

check(
  "rollup: fixed exact per currency, percent ≈ list, unpriced counted",
  (() => {
    const r = boardDiscountRollup(
      [
        discount({ id: 1, kind: "fixed", value_minor: 50000, currency: "BDT" }),
        discount({
          id: 2,
          kind: "percent",
          value_minor: 10,
          applied_at: "2026-11-01T00:00:00.000Z",
        }),
        discount({
          id: 3,
          kind: "percent",
          value_minor: 50,
          product: "mystery",
          applied_at: "2026-11-02T00:00:00.000Z",
        }),
        discount({
          id: 4,
          state: "approved",
          applied_at: null,
        }),
      ],
      (d) => (d.product === "base" ? { minor: 2499900, currency: "BDT" } : null),
      new Date("2026-11-14T00:00:00Z"),
    );
    return (
      r.activeCount === 3 &&
      eq(r.fixedByCurrency, [{ currency: "BDT", minor: 50000 }]) &&
      r.percentEstimateMinor === 249990 &&
      r.percentCount === 1 &&
      r.unvaluedCount === 1
    );
  })(),
);

if (failures > 0) {
  console.error(`${failures} s4-pricing check(s) failed.`);
  process.exit(1);
}
console.log("s4-pricing: all checks passed.");
