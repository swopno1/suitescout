// Outbound email via Resend — the only sender in the system.
// Two paths, one gate each:
//   manual — human clicks Send on an approved email draft.
//   auto   — fires at approval time, only when the kill switch is on
//            AND the lead qualifies (hot, researched email,
//            pre-contact) AND caps hold.
// Outreach sends only from a human-approved draft. The one exception
// is the owner-only deliverability test email in Settings, which sends
// with no draft at all. Fully autonomous sending would break the
// product's core promise.
// Reputation guards: verified-domain sending, rolling 24h cap,
// one email per prospect, plain-text sends, reply-STOP footer.
import { Resend } from "resend";
import {
  countSendsSince,
  getDraft,
  getProspect,
  getSendForDraft,
  hasEmailSendForProspect,
  markDraftSent,
  recordSend,
} from "./db";
import { qualifiesForAutoSend } from "./evaluate";
import { listedContact } from "./geo";
import { normalizeEmail } from "./normalize";
import { displayName } from "./prospect-label";
import type { Draft, Send } from "./types";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Personal sender: cold outreach from a human name outperforms
 *  info@ on opens and replies, and replies land with the founder.
 *  Same subdomain reputation either way. */
export function fromAddress(): string {
  const email =
    process.env.RESEND_FROM_EMAIL || "amir@mail.vivereply.com";
  const name = process.env.RESEND_FROM_NAME || "Md Amir Hossain";
  return `${name} <${email}>`;
}

/** Master kill switch — default off, enabled deliberately. */
export function autoSendEnabled(): boolean {
  return process.env.AUTO_SEND_ENABLED === "true";
}

/** Rolling-24h send cap. Default 10 (fresh-subdomain ramp —
 *  start low, raise deliberately), configurable, hard ceiling 100. */
export function dailySendCap(): number {
  const n = Number(process.env.DAILY_SEND_CAP || "10");
  if (!Number.isInteger(n) || n <= 0) return 10;
  return Math.min(n, 100);
}

/** One-click opt-out without a web page: receivers unsubscribe by
 *  mailto, replies land with the founder. */
function unsubscribeHeaders(): Record<string, string> {
  const email = process.env.RESEND_FROM_EMAIL || "amir@mail.vivereply.com";
  return {
    "List-Unsubscribe": `<mailto:${email}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

const STOP_FOOTER =
  "Don't want follow-ups? Just reply STOP and you won't hear from us again.";



/** Send an approved email draft. Manual sends need a human click;
 *  auto sends additionally need qualification. Both need caps. */
export async function sendDraftEmail(
  draftId: number,
  opts: { auto: boolean },
): Promise<{ send: Send; draft: Draft }> {
  if (!isEmailConfigured()) {
    throw new Error("RESEND_API_KEY is not set — add it to .env.");
  }
  const draft = await getDraft(draftId);
  if (!draft) throw new Error("draft not found");
  if (draft.channel !== "email") {
    throw new Error("only email drafts send via Resend");
  }
  if (draft.status !== "approved") {
    throw new Error(`draft is ${draft.status}, not approved`);
  }
  const prior = await getSendForDraft(draftId);
  if (prior && prior.status === "sent") {
    throw new Error("draft was already sent");
  }
  const prospect = await getProspect(draft.prospect_id);
  if (!prospect) throw new Error("prospect not found");

  let to: string | null;
  if (opts.auto) {
    if (!autoSendEnabled()) {
      throw new Error("auto-send is off (AUTO_SEND_ENABLED)");
    }
    const q = qualifiesForAutoSend(prospect, draft);
    if (!q.ok) {
      throw new Error(`not qualified for auto-send: ${q.reasons.join("; ")}`);
    }
    to = q.to;
  } else {
    to =
      prospect.research?.contacts?.emails[0] ??
      listedContact(prospect.contact)?.email ??
      null;
    if (!to) throw new Error("no email address on file for this prospect");
  }
  if (!to) throw new Error("no email address on file for this prospect");
  if (await hasEmailSendForProspect(prospect.id)) {
    throw new Error("this prospect was already emailed once");
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const used = await countSendsSince(since);
  const cap = dailySendCap();
  if (used >= cap) {
    throw new Error(`daily send cap reached (${used}/${cap} in 24h)`);
  }

  const resend = new Resend(process.env.RESEND_API_KEY as string);
  const subject =
    draft.subject?.trim() || `A question about ${displayName(prospect)}`;
  const text = `${draft.body.trim()}\n\n---\n${STOP_FOOTER}`;
  // Text-only: no HTML part at all. Reads human, dodges the promo
  // tab, and keeps the smallest possible abuse surface.
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject,
    text,
    headers: unsubscribeHeaders(),
    tags: [
      { name: "source", value: "suitescout" },
      { name: "auto", value: String(opts.auto) },
    ],
  });
  if (error || !data?.id) {
    const msg = error?.message ?? "unknown Resend error";
    await recordSend({
      prospect_id: prospect.id,
      draft_id: draftId,
      channel: "email",
      to_email: to as string,
      resend_id: null,
      auto: opts.auto,
      status: "failed",
      error: msg,
    });
    throw new Error(`Resend failed: ${msg}`);
  }
  const send = await recordSend({
    prospect_id: prospect.id,
    draft_id: draftId,
    channel: "email",
    to_email: to as string,
    resend_id: data.id,
    auto: opts.auto,
    status: "sent",
  });
  const updated = (await markDraftSent(draftId)) as Draft;
  return { send, draft: updated };
}

/** Owner-only deliverability check: one test email to a chosen
 *  address. Proves domain verification + key before real outreach.
 *  Recorded as channel=test so it never consumes the outreach cap. */
export async function sendTestEmail(toRaw: string): Promise<{ id: string }> {
  if (!isEmailConfigured()) {
    throw new Error("RESEND_API_KEY is not set — add it to .env.");
  }
  const to = normalizeEmail(toRaw);
  if (!to) throw new Error("enter a valid email address");
  const resend = new Resend(process.env.RESEND_API_KEY as string);
  const when = new Date().toISOString();
  const text = [
    "This is a SuiteScout deliverability test.",
    `Sent ${when} from ${fromAddress()}.`,
    "If you can read this, the domain is verified and outreach can go out.",
  ].join("\n\n");
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject: "SuiteScout test email",
    text,
    headers: unsubscribeHeaders(),
    tags: [{ name: "source", value: "suitescout-test" }],
  });
  if (error || !data?.id) {
    const msg = error?.message ?? "unknown Resend error";
    await recordSend({
      prospect_id: null,
      draft_id: null,
      channel: "test",
      to_email: to,
      resend_id: null,
      auto: false,
      status: "failed",
      error: msg,
    });
    throw new Error(`Resend failed: ${msg}`);
  }
  await recordSend({
    prospect_id: null,
    draft_id: null,
    channel: "test",
    to_email: to,
    resend_id: data.id,
    auto: false,
    status: "sent",
  });
  return { id: data.id };
}
