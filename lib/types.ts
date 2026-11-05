// SuiteScout shared types — mirrors BUILD-SPEC.md §4 (data model).

export type ProspectStatus =
  | "new"
  | "researched"
  | "drafted"
  | "contacted"
  | "replied";

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

/** Research fact sheet — BUILD-SPEC.md §6. Every fact cites a source URL. */
export interface ResearchData {
  has_website: boolean | "unknown";
  website_status: "live" | "dead" | "hijacked" | "none" | "unknown";
  has_booking_engine: boolean | "unknown";
  has_direct_booking: boolean | "unknown";
  ota_listings: string[];
  contact_channels: string[];
  languages: string[];
  room_count: number | null;
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
}

export interface Followup {
  id: number;
  prospect_id: number;
  draft_id: number | null;
  due_after_days: number;
  status: string;
}

export const PROSPECT_STATUSES: ProspectStatus[] = [
  "new",
  "researched",
  "drafted",
  "contacted",
  "replied",
];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "New",
  researched: "Researched",
  drafted: "Drafted",
  contacted: "Contacted",
  replied: "Replied",
};

/** The five agent-loop steps — BUILD-SPEC.md §7. */
export const AGENT_STEPS = [
  "Research",
  "Score",
  "Draft",
  "Log",
  "Follow up",
] as const;
