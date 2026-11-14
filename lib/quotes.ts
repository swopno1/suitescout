// S4 quote math — pure leaf (types only), unit-tested. Totals come
// from price_items rows ONLY; the domain line is the single typed
// figure (pass-through at cost, never a price).
import type {
  PriceItem,
  QuoteLine,
  QuoteMarket,
  QuoteState,
} from "./types";

export class QuoteError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "QuoteError";
    this.status = status;
  }
}

export interface QuoteBuildInput {
  market: QuoteMarket;
  /** price_items keys (base/modules/pack/bundles/roomready). */
  items: string[];
  hostingKey: string | null;
  domainLabel: string | null;
  domainAmountMinor: number | null;
  domainCurrency: "USD" | "BDT" | null;
  chatbotTier: string | null;
}

export interface BuiltQuote {
  lines: QuoteLine[];
  totalOnetimeMinor: number | null;
  totalMonthlyMinor: number | null;
  currency: "USD" | "BDT";
}

const CHATBOT_KEYS: Record<string, string> = {
  STARTER: "chatbot-starter",
  GROWTH: "chatbot-growth",
  SCALE: "chatbot-scale",
};

function byKey(items: PriceItem[]): Map<string, PriceItem> {
  return new Map(items.map((i) => [i.key, i]));
}

/** Validate selection + compute snapshot lines and totals. Throws
 *  QuoteError(400) on any bad selection (unknown/inactive key, bundle
 *  overlap, missing market price, domain/currency mismatch). */
export function buildQuoteLines(
  input: QuoteBuildInput,
  priceItems: PriceItem[],
  modelbSharePct: string,
): BuiltQuote {
  const map = byKey(priceItems);
  const currency: "USD" | "BDT" =
    input.market === "intl-sub" ? "USD" : "BDT";
  const need = (key: string): PriceItem => {
    const it = map.get(key);
    if (!it) throw new QuoteError(400, `Unknown price item: ${key}.`);
    if (!it.active) throw new QuoteError(400, `${it.name} is deactivated.`);
    return it;
  };

  if (input.items.length === 0) {
    throw new QuoteError(400, "A quote needs at least one item.");
  }
  // Bundle/pack overlap: a member must not also be listed beside its
  // bundle, or it would be charged twice.
  const selected = new Set(input.items);
  for (const key of input.items) {
    const it = need(key);
    if (it.group === "hosting" || it.group === "chatbot") {
      throw new QuoteError(
        400,
        `${it.name} is picked in its own field, not the item list.`,
      );
    }
    for (const m of it.members ?? []) {
      if (selected.has(m)) {
        throw new QuoteError(
          400,
          `${it.name} already includes ${m} — remove one.`,
        );
      }
    }
  }

  const lines: QuoteLine[] = [];
  let onetime = 0;
  let monthly = 0;
  let hasOnetime = false;
  let hasMonthly = false;

  const pushPriced = (
    key: string,
    name: string,
    kind: "onetime" | "monthly",
    unit: number | null,
  ) => {
    if (unit === null) {
      throw new QuoteError(
        400,
        `${name} has no ${kind === "onetime" ? "one-time" : "monthly"} ${currency} price — it is quoted individually.`,
      );
    }
    lines.push({ key, name, kind, unit_minor: unit, note: null });
    if (kind === "onetime") {
      onetime += unit;
      hasOnetime = true;
    } else {
      monthly += unit;
      hasMonthly = true;
    }
  };

  if (input.market === "intl-sub") {
    for (const key of input.items) {
      const it = need(key);
      pushPriced(key, it.name, "monthly", it.intl_monthly_cents);
    }
    if (input.hostingKey) {
      const h = need(input.hostingKey);
      if (h.group !== "hosting") {
        throw new QuoteError(400, `${h.name} is not a hosting tier.`);
      }
      pushPriced(h.key, h.name, "monthly", h.intl_monthly_cents);
    }
    if (input.chatbotTier) {
      const ck = CHATBOT_KEYS[input.chatbotTier];
      if (!ck) throw new QuoteError(400, "Unknown chatbot tier.");
      const c = need(ck);
      pushPriced(c.key, c.name, "monthly", c.intl_monthly_cents);
    }
  } else {
    // BD one-time + Model B setup lines share the one-time column;
    // hosting + chatbot are monthly recurring in both.
    for (const key of input.items) {
      const it = need(key);
      pushPriced(key, it.name, "onetime", it.bd_onetime_poisha);
    }
    if (input.hostingKey) {
      const h = need(input.hostingKey);
      if (h.group !== "hosting") {
        throw new QuoteError(400, `${h.name} is not a hosting tier.`);
      }
      pushPriced(h.key, h.name, "monthly", h.bd_monthly_poisha);
    }
    if (input.chatbotTier) {
      const ck = CHATBOT_KEYS[input.chatbotTier];
      if (!ck) throw new QuoteError(400, "Unknown chatbot tier.");
      const c = need(ck);
      pushPriced(c.key, c.name, "monthly", c.bd_monthly_poisha);
    }
    if (input.market === "bd-modelb") {
      lines.push({
        key: "modelb-share",
        name: `Model B revenue share (${modelbSharePct}% of completed direct bookings)`,
        kind: "note",
        unit_minor: null,
        note: "Settled per booking via S5 invoicing, not on this quote.",
      });
    }
  }

  if (input.domainLabel || input.domainAmountMinor !== null) {
    if (
      !input.domainLabel ||
      input.domainAmountMinor === null ||
      !Number.isInteger(input.domainAmountMinor) ||
      input.domainAmountMinor < 0
    ) {
      throw new QuoteError(
        400,
        "The domain line needs a label and a non-negative amount (registrar cost).",
      );
    }
    if (input.domainCurrency !== currency) {
      throw new QuoteError(
        400,
        `The domain line must be in the quote currency (${currency}).`,
      );
    }
    lines.push({
      key: "domain",
      name: `Domain (pass-through): ${input.domainLabel}`,
      kind: "onetime",
      unit_minor: input.domainAmountMinor,
      note: "Registrar cost, passed through unchanged.",
    });
    onetime += input.domainAmountMinor;
    hasOnetime = true;
  }

  return {
    lines,
    totalOnetimeMinor: hasOnetime ? onetime : null,
    totalMonthlyMinor: hasMonthly ? monthly : null,
    currency,
  };
}

// ---- quote state machine ----

const TRANSITIONS: Record<QuoteState, QuoteState[]> = {
  draft: ["sent", "declined"],
  sent: ["accepted", "declined", "expired"],
  accepted: [],
  declined: [],
  expired: [],
};

/** Next state or throw. Accepting past valid_until is refused even
 *  when the stored state is still 'sent' (validity is contractual). */
export function transitionQuote(
  from: QuoteState,
  to: QuoteState,
  validUntilIso: string | null,
  now: Date,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new QuoteError(
      409,
      `A ${from} quote cannot move to ${to}.`,
    );
  }
  if (
    to === "accepted" &&
    validUntilIso &&
    now.getTime() > new Date(validUntilIso).getTime()
  ) {
    throw new QuoteError(409, "This quote expired — send a fresh one.");
  }
}

/** Derived expiry display: a sent BD quote past valid_until IS
 *  expired (validity is contractual); the explicit 'expired'
 *  transition exists for the audit trail. */
export function isQuoteExpired(
  state: QuoteState,
  validUntilIso: string | null,
  now: Date,
): boolean {
  if (state === "expired") return true;
  return (
    state === "sent" &&
    !!validUntilIso &&
    now.getTime() > new Date(validUntilIso).getTime()
  );
}
