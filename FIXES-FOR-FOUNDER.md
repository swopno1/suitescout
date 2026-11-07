# Fixes for the founder — SuiteScout (tip 19e5248)

Small code / copy fixes found by the truth audit and the UI audit.
These are **not** docs fixes — the rewritten README already uses the
corrected wording. Apply in one pass; none of them is a docs change.
No secrets here.

## One-line fixes (do these before submitting)

1. **`lib/agent.ts:410` — false run-trace claim.** The step-4 output
   says `"Prospect flagged for human review; nothing sends itself."`
   That is false when auto-send is on: approving a qualified draft
   sends it immediately. Replace with:
   `"Follow-up draft ready for human review; outreach sends only from an approved draft."`
   (Same stale "nothing sends" wording lives in a comment at
   `lib/email.ts:7` — reword it the same way.)
2. **`lib/email.ts` test-email success path — `resend_id` recorded
   null.** The success branch records the send with `resend_id: null`
   while returning `data.id` to the caller (the main send path records
   it correctly). Fix: record `resend_id: data.id` in the success
   `recordSend` call. Until fixed, test-email rows in the sends table
   cannot be traced back to Resend.
3. **`lib/db.ts:906` — "Drafts ready" counts sent drafts.**
   `countDrafts()` counts every row in `drafts`, all statuses. Either
   count only `status = 'draft'`, or rename the stat to "Drafts on
   file". Do not cite a drafts-ready number anywhere until this is
   fixed.
4. **`lib/db.ts:31` — stale comment.** Says "the five tables"; the
   schema has eight. Change to "the eight tables".
5. **Dockerfile comment — stale count.** Says "All 4 runtime
   variables"; compose passes nine (plus compose-only `TZ`). Change
   to: "All runtime variables arrive via the environment from
   docker-compose.yml."
6. **Code comments citing `docs/BUILD-SPEC.md` (seven sites).**
   `docs/*` is gitignored, so the file can never be committed and the
   citations are dead. Re-point them at `lib/scoring.ts` /
   `scripts/scoring-test.ts` (the rubric) or delete them.

## Copy fixes (UI strings the docs cannot fix)

7. **Approve button — no warning, no feedback.** Approving can send
   immediately when auto-send is on and the lead qualifies, but the
   button warns of nothing and drops the API's auto-send result.
   Add a confirmation/warning on Approve when auto-send is enabled,
   and show the result ("sent" / "queued") after the click.
8. **"Demo" badge — unexplained in three places.** It means "seeded
   demo prospect used in the walkthrough video" (`lib/seed.ts:6-7`).
   Add that as a tooltip/label wherever the badge renders.
9. **Login page copy — "Owner access only — this tool runs one
   pipeline, yours."** Reads as telling a judge they should not be
   there. Reword to welcome the demo login and add one line saying
   what SuiteScout does (the live login page currently explains
   nothing about the product).
10. **Fact sheet — raw booleans.** `true`/`false` render literally.
    Render Yes/No.
11. **"In talks" board grouping — unlabeled.** It is Contacted +
    Replied. Label it as such.
12. **Settings "X sent in last 24h" — unexplained.** The count is
    outreach emails only (`status = 'sent' AND channel = 'email'`);
    there is no send log behind it. Label the count honestly.
13. **Empty board — no first step.** An unscored board shows 20
    prospects and no guidance. Add one line: run a prospect (or
    "Run all New") to score it.

## Missing features (decide; do not claim as done)

14. **STOP footer promise has no mechanism.** Outgoing mail promises
    "Just reply STOP and you won't hear from us again", but no inbox
    is processed and no suppression table exists — a STOP reply
    currently does nothing. Either build suppression (inbox
    processing + suppression table + check before sending) or change
    the footer copy. Do not keep promising what does not exist.
15. **Follow-ups are a dead end.** No draft link/action from a
    follow-up, no mark-done. Add both, or keep the README's honest
    "Current limitations" wording.
16. **No `/api/health`.** The compose healthcheck probes `/` and
    treats the redirect to `/login` as alive. Add a real health
    endpoint if a judge is expected to probe one.
17. **No non-root `USER` in the Dockerfile.** Compose mitigates with
    `cap_drop: ALL`, `no-new-privileges`, memory/pids limits; a
    `USER` line would close it properly.
18. **No scheduled sending.** Follow-up "due" is only a date string;
    nothing ever fires follow-ups. Out of scope for this submission
    unless the founder explicitly wants it built.
