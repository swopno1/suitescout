# Fixes for the founder — SuiteScout

Small code / copy fixes found by the truth audit, the UI audit, and
the re-inspection pass. Status is tracked inline: DONE items are in
`main`, PARKED items wait until after judging. No secrets here.
Current tip: `538462b` (2026-11-08 ~15:00) — items 24–27 landed since the
last sync (tagline, docs refresh, video, deck screenshots).

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
6. ✅ **Code comments citing `docs/BUILD-SPEC.md` (eight sites).**
   `docs/*` is gitignored, so the citations were dead. Re-pointed at
   `lib/scoring.ts` / `scripts/scoring-test.ts` (landed `c17ede9`;
   zero citations remain in code at `af8d121`, verified by grep).
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

11. ✅ **Inference comments fixed** (`lib/inference.ts`,
    landed `65a4f86`). The KNOWN_MODELS comment no longer implies a
    separate scoring model ("The scoring model is the cheap
    classifier"); it now states only one model is used at a time,
    scoring is deterministic code, and the model writes only the
    reason prose. The stale "Friday's executor uses this" reference
    is gone too. Verified in code at `af8d121`.
12. ✅ **Public landing page at `/`, board at `/board`** (landed
    `6528edd`, 8 files). New public landing page at `/` (brand,
    locked tagline, judges band, five-step loop, rubric, guardrails,
    Vultr stack, 7 explore links, no demo password); board moved
    verbatim to `/board`; middleware PUBLIC gained `/` +
    `/og-image.png`; Nav Board→`/board`, Log in only on `/`; login
    lands on `/board`; layout metadata + corrected title. Verified
    live 2026-11-08 ~12:31 (`/` 200 public, `/board` logged-out
    307).

## Done since the last sync (2026-11-08, tip `3dcb1e3`)

- ✅ **Tagline "Resort PMS sales-ops" in code** (landed `4c91fa4`).
  Landing hero, header subtitle, login subtitle, OG alt text. The
  submission title is unchanged ("SuiteScout — ViveReply's Resort
  PMS sales agent").
- ✅ **Docs refresh + OG-status correction** (landed `81789bb`,
  `e46215b`). README title/tagline, live-demo paragraph, login
  section (public exceptions), UI tour order, checklist re-sync,
  BRAND.md tagline + feature-image + public-home sections. The
  OG-status correction fixed a stale-evidence error: the file in
  the repo as `public/suitescout-og-image.png` is the new-tagline
  1200×630 PNG (87,690 bytes) — the rename is done (2026-11-08
  ~15:00, `public/og-image.png` in the repo, old name gone); only
  the VM rebuild remains before `/og-image.png` serves.
- ✅ **Demo video filmed + edited** (2026-11-08 ~14:12). The
  founder's 4:22 take, edited to 2:27 (1920×1160): landing → login
  → board (29 prospects) → Balishira Resort (55 Warm, live) →
  drafts → Approve on camera (Approve-only, no send filmed) → run
  trace (Run #37, Sreemangal Eco Resort) → Settings. Fresh
  narration voiceover replaces the founder's unclean take; soft
  music bed; the saved-password dropdown (which showed his other
  accounts) is cut out entirely. Link:
  https://youtu.be/4V5lu60qQC8 — also in the README's new Demo
  video section.
- ✅ **Pitch deck re-rendered with the real screenshots**
  (2026-11-08 ~14:09). Slide 4 = 01-login + 02-board, slide 5 =
  04-run-trace + 03-prospect-detail; speaker notes corrected (29
  prospects, all drafted; the trace is Sreemangal Run #37). PDF +
  PPTX under the same names. The video link is in (2026-11-08
  ~14:56, https://youtu.be/4V5lu60qQC8); both files re-exported.
  (Slide 4's login image is the landing duplicate until the
  01-login swap — re-render after the swap.)
- ✅ **Five screenshots taken + staged** (2026-11-08 ~13:52).
  Viewport captures 2880×1740, uploaded to the repo at
  `public/screenshots/` (2026-11-08 ~15:00). **Found while
  captioning:** the viewport file sent as `01-login.png` is a
  second copy of the landing page, not the login form — the real
  login capture is the full-page `01-login_full.png`, which must
  replace it as `public/screenshots/01-login.png` (checklist
  item 1). The other four match their names (board at 29
  prospects; Balishira 55 Warm; Sreemangal Run #37, 30 Cold;
  Settings).

## Parked until after judging (do not claim as done)

Copy fixes (UI strings):

13. **Approve button — no warning, no feedback.** Approving can send
    immediately when auto-send is on and the lead qualifies, but the
    button warns of nothing and drops the API's auto-send result.
    Add a confirmation/warning on Approve when auto-send is enabled,
    and show the result ("sent" / "queued") after the click.
14. **"Demo" badge — unexplained.** It means "seeded demo prospect
    used in the walkthrough video" (`lib/seed.ts`). Add that as a
    tooltip/label wherever the badge renders.
15. **Fact sheet — raw booleans.** `true`/`false` render literally.
    Render Yes/No.
16. **"In talks" board grouping — unlabeled.** It is Contacted +
    Replied. Label it as such.
17. **Settings "X sent in last 24h" — unexplained.** The count is
    outreach emails only (`status = 'sent' AND channel = 'email'`);
    there is no send log behind it. Label the count honestly.
18. **Empty board — no first step.** An unscored board shows the
    seeded prospects and no guidance. Add one line: run a prospect
    (or "Run all New") to score it.

Missing features (decide; do not claim as done):

19. **STOP footer promise has no mechanism.** Outgoing mail promises
    "Just reply STOP and you won't hear from us again", but no inbox
    is processed and no suppression table exists — a STOP reply
    currently does nothing. Either build suppression (inbox
    processing + suppression table + check before sending) or change
    the footer copy. Do not keep promising what does not exist.
20. **Follow-ups are a dead end.** No draft link/action from a
    follow-up, no mark-done — and the one-email-per-prospect guard
    blocks follow-up emails entirely until it learns a follow-up
    exception. Add the link + mark-done + the exception, or keep the
    README's honest "Current limitations" wording.
21. **No `/api/health`.** The compose healthcheck probes `/`,
    which now serves the public landing page (200) — it confirms the
    app serves, but there is still no dedicated health route. Add a
    real health endpoint if a judge is expected to probe one.
22. **No non-root `USER` in the Dockerfile.** Compose mitigates with
    `cap_drop: ALL`, `no-new-privileges`, memory/pids limits; a
    `USER` line would close it properly.
23. **No scheduled sending.** Follow-up "due" is only a date string;
    nothing ever fires follow-ups. Out of scope for this submission
    unless the founder explicitly wants it built.
24. **Settings daily-cap copy is stale.** The auto-send explainer
    says "never more than 20 emails per 24 hours", but the enforced
    cap is 10/day (`DAILY_SEND_CAP` default 10, `lib/email.ts`) —
    and the landing page itself says "10-sends-per-day cap". A judge
    comparing the two screens catches the contradiction. One-line
    copy fix: make the Settings string say 10. Do not quote the
    stale number in the README or the submission.
