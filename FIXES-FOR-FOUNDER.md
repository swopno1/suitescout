# Fixes for the founder — SuiteScout

Small code / copy fixes found by the truth audit, the UI audit, and
the re-inspection pass. Status is tracked inline: DONE items are in
`main`, PARKED items wait until after judging. No secrets here.

## Done before submitting (in `main`)

1. ✅ **`lib/agent.ts` — false run-trace claim.** Step-4 output said
   `"Prospect flagged for human review; nothing sends itself."` —
   false when auto-send is on. Now reads `"Follow-up draft ready for
   human review; outreach sends only from an approved draft."`
   (landed `c17ede9`).
2. ✅ **`lib/email.ts` test-email success path — `resend_id`
   recorded.** The success branch recorded `resend_id: null` while
   returning `data.id` to the caller. Now records `resend_id:
   data.id` (landed `c17ede9`).
3. ✅ **`lib/db.ts` — "Drafts ready" counts awaiting-approval only.**
   `countDrafts()` counted every row in `drafts`, all statuses. Now
   `WHERE status = 'draft'` (landed `c17ede9`).
4. ✅ **`lib/db.ts` — stale comment.** Said "the five tables"; the
   schema has eight (landed `c17ede9`).
5. ✅ **Dockerfile comment — stale count.** Said "All 4 runtime
   variables"; compose passes nine (plus compose-only `TZ`). Now
   reads "All runtime variables arrive via the environment from
   docker-compose.yml" (landed `c17ede9`).
6. ✅ **Code comments citing `docs/BUILD-SPEC.md` (seven sites).**
   `docs/*` is gitignored, so the citations were dead. Re-pointed at
   `lib/scoring.ts` / `scripts/scoring-test.ts` (landed `c17ede9`).
7. ✅ **Login page copy** (`app/login/page.tsx`). Said "Owner access
   only — this tool runs one pipeline, yours." — the first screen a
   judge sees, reading as "go away" and explaining nothing. Now
   welcomes the demo login and says what the product does in one
   line (re-inspection pass).
8. ✅ **Settings model label** (`lib/inference.ts`). Qwen's label read
   "scoring / classification" while the README (truthfully) says
   Qwen is not used for scoring — a judge comparing the two would
   catch the contradiction. Now just "Qwen 3.8 Flash Next"
   (re-inspection pass).
9. ✅ **Test fixtures use obviously-fake numbers**
   (`scripts/ui-proof.ts`). Phone-like fixtures (`01766557760`)
   looked plausibly real, violating the repo's own "no phone
   numbers" rule under a strict read. Now `01700000000`-style
   throughout; all 35 checks still pass (re-inspection pass).
10. ✅ **`backups/` gitignored.** Nightly DB dumps on the VM can no
    longer be committed by accident (re-inspection pass).

## Parked until after judging (do not claim as done)

Copy fixes (UI strings):

11. **Approve button — no warning, no feedback.** Approving can send
    immediately when auto-send is on and the lead qualifies, but the
    button warns of nothing and drops the API's auto-send result.
    Add a confirmation/warning on Approve when auto-send is enabled,
    and show the result ("sent" / "queued") after the click.
12. **"Demo" badge — unexplained.** It means "seeded demo prospect
    used in the walkthrough video" (`lib/seed.ts`). Add that as a
    tooltip/label wherever the badge renders.
13. **Fact sheet — raw booleans.** `true`/`false` render literally.
    Render Yes/No.
14. **"In talks" board grouping — unlabeled.** It is Contacted +
    Replied. Label it as such.
15. **Settings "X sent in last 24h" — unexplained.** The count is
    outreach emails only (`status = 'sent' AND channel = 'email'`);
    there is no send log behind it. Label the count honestly.
16. **Empty board — no first step.** An unscored board shows 20
    prospects and no guidance. Add one line: run a prospect (or
    "Run all New") to score it.

Missing features (decide; do not claim as done):

17. **STOP footer promise has no mechanism.** Outgoing mail promises
    "Just reply STOP and you won't hear from us again", but no inbox
    is processed and no suppression table exists — a STOP reply
    currently does nothing. Either build suppression (inbox
    processing + suppression table + check before sending) or change
    the footer copy. Do not keep promising what does not exist.
18. **Follow-ups are a dead end.** No draft link/action from a
    follow-up, no mark-done — and the one-email-per-prospect guard
    blocks follow-up emails entirely until it learns a follow-up
    exception. Add the link + mark-done + the exception, or keep the
    README's honest "Current limitations" wording.
19. **No `/api/health`.** The compose healthcheck probes `/` and
    treats the redirect to `/login` as alive. Add a real health
    endpoint if a judge is expected to probe one.
20. **No non-root `USER` in the Dockerfile.** Compose mitigates with
    `cap_drop: ALL`, `no-new-privileges`, memory/pids limits; a
    `USER` line would close it properly.
21. **No scheduled sending.** Follow-up "due" is only a date string;
    nothing ever fires follow-ups. Out of scope for this submission
    unless the founder explicitly wants it built.
