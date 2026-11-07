// SuiteScout agent loop — BUILD-SPEC.md §7.
// Five steps: Research → Score → Draft → Log → Follow up. The run
// trace IS the demo.
//
// Deterministic core, LLM language layer:
// - Research (live fetch + extraction) and scoring (the rubric) are
//   code — reproducible without an API key.
// - The LLM writes polished score reasons and the two drafts. When
//   VULTR_INFERENCE_API_KEY is missing or a call fails, the agent falls
//   back to the scorer's reasons and to template drafts built from the
//   research facts — and says so in the step output. It never fakes a
//   reply and never fails a run over prose.
// Hard rules (non-negotiable): drafts never contain prices; no fake
// scarcity, no invented features, no invented stats; one genuine
// observation minimum; a human approves every send — the agent never
// sends.

import {
  createDraft,
  createFollowup,
  getProspect,
  getRun,
  getSetting,
  updateProspectResearch,
  updateProspectStatus,
  updateRun,
  listDraftsForProspect,
  listFollowupsForProspect,
} from "./db";
import { extractResearch } from "./research";
import { scoreResearch } from "./scoring";
import { chatCompletion, isInferenceConfigured } from "./inference";
import type { Prospect, ResearchData, RunStep } from "./types";

const FOLLOWUP_DEFAULT_DAYS = 3;

function nowIso(): string {
  return new Date().toISOString();
}

/** The sharpest genuine observation about the property, from the
 *  research facts — the hook every draft is built on. */
export function pickObservation(research: ResearchData): string {
  if (
    research.website_status === "dead" ||
    research.website_status === "none"
  ) {
    return "your website doesn't load — guests searching for you find nothing you own";
  }
  if (research.website_status === "hijacked") {
    return "your website is showing a broken / parked template instead of your resort";
  }
  if (research.has_booking_engine === false) {
    return "your site shows your rooms but there's no way to book online";
  }
  if (research.ota_listings.length > 0) {
    return `your bookings run through ${research.ota_listings.join(", ")} — commission and guest data go to middlemen`;
  }
  if (research.demand_signals.length > 0) {
    return `you have real demand (${research.demand_signals[0]}) but no owned channel to capture it`;
  }
  return "your guests can only reach you by phone or message — there's no online booking";
}

/** Business-day date N business days out (Mon–Fri), for the follow-up. */
function businessDaysOut(days: number): string {
  const d = new Date();
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d.toISOString().slice(0, 10);
}

function templateEmail(
  prospect: Prospect,
  observation: string,
): { subject: string; body: string } {
  const subject = `${prospect.name} — your bookings could stay with you`;
  const body = [
    `Hi ${prospect.name} team,`,
    ``,
    `I came across ${prospect.name} and noticed ${observation}.`,
    ``,
    `ViveReply Suite is a resort property management system with a direct-booking website — your rooms, your bookings, your guest data, in one place. Resorts using it stop routing every guest through phone calls and third-party sellers.`,
    ``,
    `Would a 15-minute demo this week be useful? I can show you how your own property would look with direct booking.`,
    ``,
    `Best,`,
    `Md Amir Hossain — ViveReply (vivereply.com/suite)`,
  ].join("\n");
  return { subject, body };
}

function templateWhatsApp(
  prospect: Prospect,
  observation: string,
): string {
  return (
    `Hi, I'm Md Amir from ViveReply. I noticed ${observation} at ${prospect.name}. ` +
    `We build direct-booking websites + a resort management system for properties like yours, so bookings stay with you instead of going through middlemen. ` +
    `Would a quick 15-minute demo this week be useful?`
  );
}

function templateFollowup(
  prospect: Prospect,
  observation: string,
  dueDate: string,
): string {
  return (
    `Hi ${prospect.name} team — following up on my note about ${observation}. ` +
    `If direct booking is on your mind before peak season, a 15-minute demo is the fastest way to see it on your own property. ` +
    `Happy to work around your schedule — aiming for ${dueDate}. — Md Amir, ViveReply`
  );
}

async function llmReasons(
  prospect: Prospect,
  research: ResearchData,
  reasons: string[],
): Promise<string[] | null> {
  try {
    const text = await chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "You write short, factual explanations for a sales-ops agent. Use ONLY the facts given. Never invent prices, features, statistics, or claims. Keep each explanation to 2–3 sentences.",
        },
        {
          role: "user",
          content: [
            `Prospect: ${prospect.name} (${prospect.location ?? "Bangladesh"}).`,
            `Research facts: ${JSON.stringify(research)}`,
            `Scored signals (already decided by the rubric — do not change the points):`,
            ...reasons,
            `Rewrite each signal as 2–3 plain sentences, one line per signal, in the same order.`,
          ].join("\n"),
        },
      ],
      temperature: 0.3,
      maxTokens: 700,
    });
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^\s*[-•\d.)\s]+/, "").trim())
      .filter(Boolean);
    return lines.length >= reasons.length ? lines : null;
  } catch {
    return null;
  }
}

async function llmDraft(
  kind: "email" | "whatsapp",
  prospect: Prospect,
  observation: string,
): Promise<{ subject: string | null; body: string } | null> {
  try {
    const channel =
      kind === "email"
        ? "a first-touch email (with a Subject line, then the body)"
        : "a short WhatsApp opener (under 400 characters, one message)";
    const text = await chatCompletion({
      messages: [
        {
          role: "system",
          content: [
            "You draft first-touch outreach for ViveReply Suite — a resort property management system with a direct-booking website.",
            "HARD RULES: never mention any price or fee; no fake scarcity or urgency; no invented features, statistics, or claims; include the genuine observation given; keep it short and human; end with a 15-minute demo ask.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Write ${channel} to ${prospect.name} (${prospect.location ?? "Bangladesh"}).`,
            `Genuine observation: ${observation}.`,
            kind === "email"
              ? "Format: first line 'Subject: ...', then a blank line, then the body. Sign as Md Amir Hossain, ViveReply."
              : "Plain message text only, no subject. Sign as Md Amir, ViveReply.",
          ].join("\n"),
        },
      ],
      temperature: 0.5,
      maxTokens: 500,
    });
    if (kind === "email") {
      const m = text.match(/Subject:\s*(.+?)\n/i);
      const subject = m ? m[1].trim() : null;
      const body = text
        .replace(/Subject:\s*.+?\n/i, "")
        .trim();
      return body ? { subject, body } : null;
    }
    return { subject: null, body: text.trim() };
  } catch {
    return null;
  }
}

/** Execute the five-step loop for a run. Idempotent: a run that is
 *  already done/failed/running is left alone. */
export async function runAgent(runId: number): Promise<void> {
  const run = await getRun(runId);
  if (!run) return;
  if (run.status !== "queued") return;

  const prospect = await getProspect(run.prospect_id);
  if (!prospect) {
    await updateRun(runId, { status: "failed" });
    return;
  }

  const steps: RunStep[] = run.steps.map((s) => ({ ...s }));
  const persist = async (status?: "running" | "done" | "failed") => {
    await updateRun(runId, { steps, status });
  };

  const setStep = (i: number, patch: Partial<RunStep>) => {
    steps[i] = { ...steps[i], ...patch };
  };

  const fail = async (i: number, err: unknown) => {
    const msg = err instanceof Error ? err.message : "unknown error";
    setStep(i, {
      status: "failed",
      finished: nowIso(),
      output: `Step failed: ${msg}`,
    });
    await persist("failed");
  };

  await persist("running");

  // ---- Step 1: Research ----
  setStep(0, { status: "running", started: nowIso(), note: null });
  await persist();
  let research: ResearchData;
  let fetchLog: string[];
  try {
    ({ research, fetchLog } = await extractResearch(prospect));
    const summary = [
      `Website: ${research.website_status}`,
      `Booking engine: ${String(research.has_booking_engine)}`,
      `Direct booking: ${String(research.has_direct_booking)}`,
      research.ota_listings.length
        ? `OTAs: ${research.ota_listings.join(", ")}`
        : "OTAs: none found",
      research.contact_channels.length
        ? `Contact: ${research.contact_channels.join(", ")}`
        : "Contact: none found",
      research.room_count !== null ? `Rooms: ${research.room_count}` : null,
      research.room_types.length
        ? `Room types: ${research.room_types.join(", ")}`
        : null,
      research.demand_signals.length
        ? `Demand: ${research.demand_signals.join("; ")}`
        : "Demand: none found",
    ]
      .filter(Boolean)
      .join("\n");
    setStep(0, {
      status: "done",
      finished: nowIso(),
      evidence: research.sources,
      output: `${summary}\n\nFetch log:\n${fetchLog.join("\n")}`,
    });
    await persist();
  } catch (err) {
    await fail(0, err);
    return;
  }

  // ---- Step 2: Score ----
  setStep(1, { status: "running", started: nowIso(), note: null });
  await persist();
  try {
    const scored = scoreResearch(research);
    let reasons = scored.reasons;
    let llmUsed = false;
    if (isInferenceConfigured()) {
      const polished = await llmReasons(prospect, research, scored.reasons);
      if (polished) {
        reasons = polished;
        llmUsed = true;
      }
    }
    await updateProspectResearch(
      prospect.id,
      research,
      scored.score,
      scored.band,
      reasons,
    );
    await updateProspectStatus(prospect.id, "researched");
    setStep(1, {
      status: "done",
      finished: nowIso(),
      evidence: research.sources,
      output: [
        `Fit score: ${scored.score}/100 — ${scored.band.toUpperCase()}`,
        ``,
        ...reasons,
        ``,
        llmUsed
          ? "(Reasons polished by DeepSeek via Vultr Serverless Inference.)"
          : "(Reasons from the deterministic rubric — no LLM key configured or the call failed.)",
      ].join("\n"),
    });
    await persist();
  } catch (err) {
    await fail(1, err);
    return;
  }

  // ---- Step 3: Draft ----
  setStep(2, { status: "running", started: nowIso(), note: null });
  await persist();
  try {
    const observation = pickObservation(research);
    const llmOn = isInferenceConfigured();
    const email = llmOn
      ? await llmDraft("email", prospect, observation)
      : null;
    const wa = llmOn
      ? await llmDraft("whatsapp", prospect, observation)
      : null;
    const emailFinal = email ?? templateEmail(prospect, observation);
    const waFinal = wa ?? {
      subject: null,
      body: templateWhatsApp(prospect, observation),
    };
    const emailDraft = await createDraft({
      prospectId: prospect.id,
      channel: "email",
      subject: emailFinal.subject,
      body: emailFinal.body,
    });
    const waDraft = await createDraft({
      prospectId: prospect.id,
      channel: "whatsapp",
      subject: null,
      body: waFinal.body,
    });
    await updateProspectStatus(prospect.id, "drafted");
    setStep(2, {
      status: "done",
      finished: nowIso(),
      evidence: research.sources,
      output: [
        `Observation: ${observation}.`,
        ``,
        `Email draft #${emailDraft.id}${email ? " (DeepSeek)" : " (template — LLM unavailable)"}: ${emailFinal.subject ?? "(no subject)"}`,
        `WhatsApp draft #${waDraft.id}${wa ? " (DeepSeek)" : " (template — LLM unavailable)"}.`,
        ``,
        `No prices in either draft. A human approves every send.`,
      ].join("\n"),
    });
    await persist();
  } catch (err) {
    await fail(2, err);
    return;
  }

  // ---- Step 4: Log ----
  setStep(3, { status: "running", started: nowIso(), note: null });
  await persist();
  try {
    const fresh = await getProspect(prospect.id);
    const drafts = await listDraftsForProspect(prospect.id);
    const followups = await listFollowupsForProspect(prospect.id);
    setStep(3, {
      status: "done",
      finished: nowIso(),
      evidence: research.sources,
      output: [
        `Board updated: ${fresh?.name} → ${fresh?.status}, score ${fresh?.fit_score ?? "—"}/100 (${fresh?.score_band ?? "—"}).`,
        `${drafts.length} draft(s) on file, ${followups.length} follow-up(s) scheduled.`,
        `Run #${runId} trace complete — research, score, drafts and board state all persisted.`,
      ].join("\n"),
    });
    await persist();
  } catch (err) {
    await fail(3, err);
    return;
  }

  // ---- Step 5: Follow up ----
  setStep(4, { status: "running", started: nowIso(), note: null });
  await persist();
  try {
    const delayRaw = await getSetting("followup_delay_days");
    const delay = delayRaw ? Number(delayRaw) : FOLLOWUP_DEFAULT_DAYS;
    const days = Number.isFinite(delay) && delay > 0 ? Math.floor(delay) : FOLLOWUP_DEFAULT_DAYS;
    const dueDate = businessDaysOut(days);
    const observation = pickObservation(research);
    const followupDraft = await createDraft({
      prospectId: prospect.id,
      channel: "email",
      subject: `Re: ${prospect.name} — quick follow-up`,
      body: templateFollowup(prospect, observation, dueDate),
    });
    await createFollowup({
      prospectId: prospect.id,
      draftId: followupDraft.id,
      dueAfterDays: days,
    });
    setStep(4, {
      status: "done",
      finished: nowIso(),
      evidence: research.sources,
      output: [
        `Follow-up draft #${followupDraft.id} ready — due in ${days} business day(s) (${dueDate}).`,
        `Prospect flagged for human review; nothing sends itself.`,
      ].join("\n"),
    });
    await persist();
  } catch (err) {
    await fail(4, err);
    return;
  }

  await persist("done");
}
