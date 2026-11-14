// SuiteScout shared types — the data model (see SCHEMA_SQL in lib/db.ts).

export type ProspectStatus =
  | "new"
  | "researched"
  | "drafted"
  | "contacted"
  | "replied"
  | "closed";

export type ScoreBand = "hot" | "warm" | "cold";

export type RunStatus = "queued" | "running" | "done" | "failed";

export type RunStepStatus = "pending" | "running" | "done" | "failed";

export type DraftChannel = "email" | "whatsapp";

export type DraftStatus = "draft" | "approved" | "sent";

export interface RunStep {
  name: string;
  status: RunStepStatus;
  started: string | null;
  finished: string | null;
  evidence: string[];
  output: string | null;
  note?: string | null;
}

/** Research fact sheet — every fact cites a source URL. */
export interface ResearchData {
  has_website: boolean | "unknown";
  website_status: "live" | "dead" | "hijacked" | "none" | "unknown";
  has_booking_engine: boolean | "unknown";
  has_direct_booking: boolean | "unknown";
  ota_listings: string[];
  contact_channels: string[];
  /** Actual contact values found on the public site (optional: runs
   *  before this field existed stored none — a re-run captures them). */
  contacts?: {
    emails: string[];
    phones: string[];
    whatsapp: string[];
  };
  languages: string[];
  room_count: number | null;
  room_types: string[];
  location: string | null;
  social_links: string[];
  mobile_friendly: boolean | "unknown";
  demand_signals: string[];
  sources: string[];
}

export interface Prospect {
  id: number;
  name: string;
  website: string | null;
  location: string | null;
  source: string;
  contact: string | null;
  /** Public research sources (Facebook page + directory/listing URLs)
   *  seeded from the batch-3 research file. Public pages only — never
   *  phone numbers or emails. */
  research_sources: string[] | null;
  status: ProspectStatus;
  fit_score: number | null;
  score_band: ScoreBand | null;
  score_reasons: string[] | null;
  research: ResearchData | null;
  demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: number;
  prospect_id: number;
  steps: RunStep[];
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
}

export interface Draft {
  id: number;
  prospect_id: number;
  channel: DraftChannel;
  subject: string | null;
  body: string;
  status: DraftStatus;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
}

/** An area scout: place in, prospects out. Runs in the background
 *  while the /scout view polls; phases + counts make progress visible. */
export interface Scout {
  id: number;
  place: string;
  display_name: string | null;
  south: number | null;
  west: number | null;
  north: number | null;
  east: number | null;
  status: "running" | "done" | "failed";
  phase: "geocoding" | "searching" | "importing" | "done";
  found: number;
  junk_skipped: number;
  dupes_skipped: number;
  imported: number;
  prospect_ids: number[];
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

/** A real send attempt through Resend — the audit trail. Failed
 *  attempts are kept too (status=failed with the provider error). */
export interface Send {
  id: number;
  prospect_id: number | null;
  draft_id: number | null;
  channel: string;
  to_email: string;
  resend_id: string | null;
  auto: boolean;
  status: string;
  error: string | null;
  created_at: string;
}

export interface Followup {
  id: number;
  prospect_id: number;
  draft_id: number | null;
  due_after_days: number;
  status: string;
  created_at: string;
}

export const PROSPECT_STATUSES: ProspectStatus[] = [
  "new",
  "researched",
  "drafted",
  "contacted",
  "replied",
  "closed",
];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "New",
  researched: "Researched",
  drafted: "Drafted",
  contacted: "Contacted",
  replied: "Replied",
  closed: "Closed",
};

/** One pipeline move — the lead timeline. from_status is null for the
 *  initial "added as new" event. */
export interface ProspectStatusEvent {
  id: number;
  prospect_id: number;
  from_status: ProspectStatus | null;
  to_status: ProspectStatus;
  created_at: string;
}

/** The five agent-loop steps: Research → Score → Draft → Log → Follow up. */
export const AGENT_STEPS = [
  "Research",
  "Score",
  "Draft",
  "Log",
  "Follow up",
] as const;

/** S3 audit spine: one row per admin write against another system.
 *  No admin write exists without a row here (see lib/concierge-write). */
export interface AdminAction {
  id: number;
  at: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
}

/** S4 pricing: one sellable line. Money in minor units (cents/poisha). */
export interface PriceItem {
  id: number;
  key: string;
  name: string;
  group: string;
  intl_monthly_cents: number | null;
  bd_onetime_poisha: number | null;
  bd_monthly_poisha: number | null;
  bd_floor_poisha: number | null;
  editable: boolean;
  active: boolean;
  members: string[] | null;
  sort_order: number;
}

export interface PriceRule {
  key: string;
  value: string;
  note: string;
}

export type QuoteMarket = "intl-sub" | "bd-onetime" | "bd-modelb";
export type QuoteState = "draft" | "sent" | "accepted" | "declined" | "expired";

export interface QuoteLine {
  key: string;
  name: string;
  /** 'onetime' | 'monthly' | 'note' (terms with no figure, e.g. Model B 5%). */
  kind: "onetime" | "monthly" | "note";
  unit_minor: number | null;
  note: string | null;
}

export interface Quote {
  id: number;
  created_at: string;
  updated_at: string;
  customer_name: string;
  prospect_id: number | null;
  market: QuoteMarket;
  items: string[];
  hosting_key: string | null;
  domain_label: string | null;
  domain_amount_minor: number | null;
  domain_currency: "USD" | "BDT" | null;
  chatbot_tier: string | null;
  state: QuoteState;
  valid_until: string | null;
  lines: QuoteLine[];
  total_onetime_minor: number | null;
  total_monthly_minor: number | null;
  currency: "USD" | "BDT";
  notes: string | null;
}

export type DiscountTarget = "quote" | "subscription" | "hosting";
export type DiscountKind = "percent" | "fixed";
export type DiscountState =
  | "requested"
  | "approved"
  | "denied"
  | "applied"
  | "expired";

export interface Discount {
  id: number;
  created_at: string;
  updated_at: string;
  target_type: DiscountTarget;
  /** Quote id, concierge property id, or quote id (hosting). */
  target_id: string;
  customer_label: string;
  /** price_items.key, or 'concierge-subscription' for rail A. */
  product: string;
  kind: DiscountKind;
  /** Percent: whole percent 1–100. Fixed: minor units. */
  value_minor: number;
  currency: "USD" | "BDT" | null;
  duration_kind: "once" | "ongoing" | "months";
  duration_months: number | null;
  reason: string;
  state: DiscountState;
  below_floor: boolean;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  consumed_at: string | null;
  stripe_coupon_id: string | null;
  stripe_subscription_id: string | null;
  last_error: string | null;
}
