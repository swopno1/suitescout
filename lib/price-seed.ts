// S4 pricing seed — the APPROVED v3 figures
// (suite-pricing-breakdown-v3-2026-11-14.md, founder 2026-11-14).
// Pure data module: db.ts seeds price_items/price_rules from here on
// empty tables, and the test script asserts the v3 reconciliation
// sums from the same source (transcription guard). After seeding,
// repricing is a console edit — never touch these figures to reprice.
//
// Money: intl USD cents, BD poisha (integers, never floats).
// tiers: chatbot $19/$49/$119 + ৳1,999/4,999/9,999 read in
// STARTER/GROWTH/SCALE order (the only tier order in the codebase).

export type PriceGroup =
  | "base"
  | "module"
  | "pack"
  | "bundle"
  | "hosting"
  | "roomready"
  | "chatbot";

export interface SeedPriceItem {
  key: string;
  name: string;
  group: PriceGroup;
  /** Intl subscription, USD cents / month. Null = not offered. */
  intlMonthlyCents: number | null;
  /** BD Model A one-time, poisha. Null = not offered / quoted. */
  bdOnetimePoisha: number | null;
  /** BD recurring, poisha / month (hosting + chatbot). */
  bdMonthlyPoisha: number | null;
  /** BD floor, poisha. Null = no floor (any discount needs explicit approval). */
  bdFloorPoisha: number | null;
  /** False for chatbot rows: Stripe is their home, display only here. */
  editable: boolean;
  /** Member item keys (packs/bundles only). */
  members: string[] | null;
  sortOrder: number;
}

export const V3_PRICE_ITEMS: SeedPriceItem[] = [
  { key: "base", name: "Base package", group: "base", intlMonthlyCents: 4900, bdOnetimePoisha: 2499900, bdMonthlyPoisha: null, bdFloorPoisha: 1999900, editable: true, members: null, sortOrder: 10 },
  { key: "mod-payments", name: "Payments", group: "module", intlMonthlyCents: 2500, bdOnetimePoisha: 1499900, bdMonthlyPoisha: null, bdFloorPoisha: 999900, editable: true, members: null, sortOrder: 20 },
  { key: "mod-frontdesk", name: "Front Desk", group: "module", intlMonthlyCents: 1900, bdOnetimePoisha: 999900, bdMonthlyPoisha: null, bdFloorPoisha: 749900, editable: true, members: null, sortOrder: 30 },
  { key: "mod-housekeeping", name: "Housekeeping", group: "module", intlMonthlyCents: 1200, bdOnetimePoisha: 799900, bdMonthlyPoisha: null, bdFloorPoisha: 599900, editable: true, members: null, sortOrder: 40 },
  { key: "mod-roomservice", name: "Room Service", group: "module", intlMonthlyCents: 900, bdOnetimePoisha: 699900, bdMonthlyPoisha: null, bdFloorPoisha: 499900, editable: true, members: null, sortOrder: 50 },
  { key: "mod-inventory", name: "Inventory", group: "module", intlMonthlyCents: 1200, bdOnetimePoisha: 999900, bdMonthlyPoisha: null, bdFloorPoisha: 699900, editable: true, members: null, sortOrder: 60 },
  { key: "mod-purchasing", name: "Purchasing", group: "module", intlMonthlyCents: 900, bdOnetimePoisha: 699900, bdMonthlyPoisha: null, bdFloorPoisha: 499900, editable: true, members: null, sortOrder: 70 },
  { key: "mod-expenses", name: "Expenses", group: "module", intlMonthlyCents: 900, bdOnetimePoisha: 699900, bdMonthlyPoisha: null, bdFloorPoisha: 499900, editable: true, members: null, sortOrder: 80 },
  { key: "mod-people", name: "People (HR + payroll)", group: "module", intlMonthlyCents: 1900, bdOnetimePoisha: 1999900, bdMonthlyPoisha: null, bdFloorPoisha: 1499900, editable: true, members: null, sortOrder: 90 },
  { key: "mod-content", name: "Content & Offers", group: "module", intlMonthlyCents: 1500, bdOnetimePoisha: 1499900, bdMonthlyPoisha: null, bdFloorPoisha: 999900, editable: true, members: null, sortOrder: 100 },
  {
    key: "pack-operations", name: "Operations pack", group: "pack",
    intlMonthlyCents: 2900, bdOnetimePoisha: 2499900, bdMonthlyPoisha: null,
    bdFloorPoisha: null, editable: true,
    members: ["mod-roomservice", "mod-inventory", "mod-purchasing", "mod-expenses"],
    sortOrder: 110,
  },
  {
    key: "bundle-growth", name: "Growth bundle", group: "bundle",
    intlMonthlyCents: 9900, bdOnetimePoisha: null, bdMonthlyPoisha: null,
    bdFloorPoisha: null, editable: true,
    members: ["base", "mod-payments", "mod-frontdesk", "mod-content"],
    sortOrder: 120,
  },
  {
    key: "bundle-complete", name: "Complete bundle", group: "bundle",
    intlMonthlyCents: 15900, bdOnetimePoisha: null, bdMonthlyPoisha: null,
    bdFloorPoisha: null, editable: true,
    members: [
      "base", "mod-payments", "mod-frontdesk", "mod-housekeeping",
      "mod-roomservice", "mod-inventory", "mod-purchasing", "mod-expenses",
      "mod-people", "mod-content",
    ],
    sortOrder: 130,
  },
  { key: "hosting-shared", name: "Shared hosting", group: "hosting", intlMonthlyCents: 1900, bdOnetimePoisha: null, bdMonthlyPoisha: 149900, bdFloorPoisha: 99900, editable: true, members: null, sortOrder: 140 },
  { key: "hosting-standard", name: "Dedicated VM — Standard", group: "hosting", intlMonthlyCents: 4900, bdOnetimePoisha: null, bdMonthlyPoisha: 299900, bdFloorPoisha: 249900, editable: true, members: null, sortOrder: 150 },
  { key: "hosting-power", name: "Dedicated VM — Power", group: "hosting", intlMonthlyCents: 8900, bdOnetimePoisha: null, bdMonthlyPoisha: null, bdFloorPoisha: null, editable: true, members: null, sortOrder: 160 },
  { key: "roomready", name: "RoomReady app (beta)", group: "roomready", intlMonthlyCents: 2900, bdOnetimePoisha: 999900, bdMonthlyPoisha: null, bdFloorPoisha: 749900, editable: true, members: null, sortOrder: 170 },
  { key: "chatbot-starter", name: "Chatbot — Starter", group: "chatbot", intlMonthlyCents: 1900, bdOnetimePoisha: null, bdMonthlyPoisha: 199900, bdFloorPoisha: null, editable: false, members: null, sortOrder: 180 },
  { key: "chatbot-growth", name: "Chatbot — Growth", group: "chatbot", intlMonthlyCents: 4900, bdOnetimePoisha: null, bdMonthlyPoisha: 499900, bdFloorPoisha: null, editable: false, members: null, sortOrder: 190 },
  { key: "chatbot-scale", name: "Chatbot — Scale", group: "chatbot", intlMonthlyCents: 11900, bdOnetimePoisha: null, bdMonthlyPoisha: 999900, bdFloorPoisha: null, editable: false, members: null, sortOrder: 200 },
];

export interface SeedPriceRule {
  key: string;
  value: string;
  note: string;
}

export const V3_PRICE_RULES: SeedPriceRule[] = [
  { key: "annual_pay_months", value: "10", note: "Annual plan: pay 10 months" },
  { key: "annual_get_months", value: "12", note: "Annual plan: get 12 months" },
  { key: "base_max_rooms", value: "30", note: "Base assumes ≤30 rooms; larger quoted individually" },
  { key: "modelb_revenue_share_pct", value: "5", note: "Model B: 5% of completed direct bookings (decision sheet item 2)" },
  { key: "chatbot_pricing_home", value: "stripe", note: "Chatbot tiers are locked in Stripe — displayed here, never edited" },
  { key: "bd_quote_validity_days", value: "7", note: "BD quotes expire 7 days after sending" },
];
