# SuiteScout README — what to include, what to remove

Source: the truth audit (Child 2) findings on tip `19e5248`,
refreshed 2026-11-08 at tip `af8d121` (locked title/tagline, landing
route `6528edd`, OG image), re-verified and finalised 2026-11-08 at
tip `538462b` (video linked, real screenshots, OG rename done — VM rebuild pending,
live board at 29 prospects). Every FALSE / EXAGGERATED / STALE claim
is on the remove list unless it was corrected; every verified-TRUE
claim and every required LabLab element is on the include list. The
rewritten `README.md` in this folder follows the include list
section-for-section, in this order.

## WHAT TO INCLUDE — final README sections, in order

1. **Title + intro** — the locked submission title "SuiteScout —
   ViveReply's Resort PMS sales agent" with the locked tagline
   "Resort PMS sales-ops" as the subtitle line; then the OG/feature
   image (`public/og-image.png`, 1200×630) and one paragraph: what
   SuiteScout is, who it sells to (resorts), what it does (research
   → score → draft → log → follow-up), human approves every
   outreach send.
2. **Live demo link + Demo video + login pointer** —
   https://suitescout.vivereply.com as a link; the landing page is
   public at `/` ("Open live demo" → `/login`, board at `/board`
   after login); the Demo video section with the YouTube link
   (https://youtu.be/4V5lu60qQC8, 2:27 — landing → login → board →
   Balishira 55 Warm live → drafts → Approve on camera, Approve-only
   → run trace Run #37 Sreemangal → Settings; fresh narration);
   demo login is published in the LabLab submission (username
   `demo`; password in the submission, never in the README). The
   video link appears exactly once in the README.
3. **Status note** — the five-step loop runs for real; the rubric
   reproduces the four worked examples (Cox Beach 80 Hot, Sundori 70
   Hot, Balishira 55 Warm, Giriraj 55 Warm); regression test
   `node scripts/scoring-test.ts` passes 6/6; the scores come from
   test fixtures, not live board data; the seed carries no scores or
   research, so a fresh empty database seeds 20 unscored prospects
   and scores appear only after a run; the live board shows 29
   prospects as of 2026-11-08 (0 Hot, 4 Warm, 25 Cold, 107 drafts
   ready, 37 follow-ups set), all researched, scored, and drafted.
4. **The five-step loop** — Research (live fetch, every fact cites a
   source, unknown stays unknown); Score (deterministic rubric, model
   writes reasons); Draft (one genuine observation, no *Suite* prices,
   no fake scarcity, no invented features); Log (board statuses New →
   Researched → Drafted → Contacted → Replied → Closed); Follow up
   (due in 3 business days by default, Fri/Sat weekend, records the
   follow-up for human review, nothing sends it on its own). Plus the
   human-gate paragraph with the owner-only test-email exception, and
   the problem statement framed on the worked examples (94-room resort
   with discount campaigns and a dead domain = a fixture fact, not
   seed data).
5. **Scoring rubric** — the full table (+30/+20/+15/+15/+10/+10/−40/−30,
   bands 70+/40–69/<40) exactly as in `lib/scoring.ts`; the
   exclusivity rules (dead site does not also get +20; phone/OTA rows
   only when no direct booking; scale = 20+ rooms OR 3+ room types;
   negatives stack; clamped 0–100); the six worked-example cases and
   the regression-test command (Node ≥22.6).
6. **Architecture** — diagram with the 8 real tables (prospects, runs,
   drafts, followups, settings, prospect_status_events, sends,
   scouts), the scout queue, the app container as the only container
   in this repo's compose file, Postgres + Caddy in the separate
   platform stack, Vultr Serverless Inference, the Resend leg, and the
   live web fetch attached to the research step (not to Resend).
7. **Vultr services used** — Cloud Compute (VM, Docker host; this
   repo's compose runs only the app container), self-hosted Postgres
   16 (`platform-postgres`, `suitescout` DB, `vivescript-net`), Vultr
   Serverless Inference (default model deepseek-v4.1-flash-1017;
   scoring is deterministic code, the model writes reason prose;
   Qwen 3.8 Flash Next, GLM 5.3 Flash, and MiMo V2.6 Flash are
   selectable models in Settings, none used for scoring). No prices,
   no context sizes, no VM specs, no credits figures — none of those
   are verifiable from the repo.
8. **How the agent executes real tasks** — live fetch not canned data;
   deterministic scoring; evidence receipts in the run trace; human
   gate; sending limits (10/day rolling cap default, max 100;
   one-email-per-prospect guard — total, however triggered, it also
   blocks follow-up emails; `List-Unsubscribe` mailto header;
   reply-STOP footer).
9. **Login** — session login at `/login`, username `demo`, password
   from `APP_PASSWORD`; HMAC cookie, 12h, HttpOnly, Secure in
   production; fail-closed; rotation logs everyone out; throttle 20
   failed attempts per IP per 10 min (429); middleware protects every
   page + API except `/` (public landing page), `/login`,
   `/api/auth/login|verify`, `/_next/`, `/brand/`, `/favicon.ico`,
   `/og-image.png`; login lands on the board at `/board`;
   `docker compose up -d` (not `restart`) after editing `.env`.
10. **Quick start (local)** — prerequisites with versions (Node 20 for
    the app, pnpm 12.16.1, PostgreSQL 16, Node ≥22.6 only for the
    scoring-test script); a local Postgres alternative (Docker
    `postgres:16-alpine` on localhost); the `platform-postgres`
    hostname explicitly flagged as VM-only and unusable on a laptop;
    `cp .env.example .env`, `pnpm install`, `pnpm dev`; first boot
    seeds the 20 batch-3 prospects when the `prospects` table is
    empty, never re-seeds; DEMO badge meaning (seeded demo prospect
    used in the walkthrough video).
11. **Deploy (Docker, on the Vultr VM)** — Docker + Compose install
    pointer, `docker compose up -d --build`, and the three things that
    live outside this repo and must already exist: the external
    `vivescript-net` network (`docker network create vivescript-net`),
    the platform stack (`~/platform`: `platform-postgres` + Caddy,
    no Caddyfile in this repo), the `suitescout` DB user; migration
    runs BEFORE first start, app stopped first so the SQLite WAL
    checkpoints.
12. **Database (PostgreSQL)** — shared `platform-postgres`, database
    `suitescout`, 8 tables; Provisioning (create user + grants, with
    `-d suitescout` on the schema grant); Migrating the old SQLite
    data (copies 5 tables, preserves ids, resets sequences, aborts if
    non-empty, `--force` truncates, does not seed); Fresh deploy /
    re-seed (seeds when the `prospects` table is empty); Rollback
    (SQLite file kept; previous-commit rollback stated as design
    intent, not re-verified).
13. **Environment** — all 9 variables with defaults
    (`VULTR_INFERENCE_API_KEY`, `VULTR_INFERENCE_MODEL`,
    `DATABASE_URL`, `APP_PASSWORD`, `RESEND_API_KEY`,
    `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `AUTO_SEND_ENABLED`,
    `DAILY_SEND_CAP`); `DATABASE_URL` wording: REQUIRED, first
    database use fails without it, Compose refuses to start without
    it; compose-only `TZ=Asia/Dhaka` noted.
14. **API** — all 19 routes as verified, including `POST
    /api/auth/verify` (POST only, JSON `{ "value" }`, returns only
    `{ "valid" }`, GET returns 405, internal middleware oracle — not
    a public session check) and `POST /api/prospects` (any of name /
    website / location, at least one required).
15. **UI tour + Screenshots** — live demo URL as a link; the tour path
    (landing page at `/` → "Open live demo" → login → board at
    `/board` with area scout + search → prospect detail → run view
    with live step trace → settings); five screenshots as **real
    embeds** (`public/screenshots/01-login.png` … `05-settings.png`
    (renamed post-submission from `05-settigns.png`), at the repo
    root — never under `docs/`, which is gitignored), each with
    a one-line caption stating what it shows: login form; board at
    29 prospects; Balishira 55 Warm live; Run #37 Sreemangal 30
    Cold (named as Sreemangal's run, never Balishira's); Settings.
    No placeholder markers anywhere in the section. Plus the feature
    image: `public/og-image.png` (1200×630) with its honest status
    (the new-tagline PNG is in the repo as
    `public/og-image.png` (renamed; VM rebuild pending)
    + rebuild pending).
16. **Current limitations** — stated honestly, never as done features:
    no scheduled sending; no follow-up mark-done; no suppression list
    / bounce-complaint webhook and the STOP footer has no mechanism
    behind it; no `/api/health` (compose healthcheck probes `/`,
    which now serves the public landing page, 200 — still no
    dedicated health route); no non-root `USER` in the Dockerfile
    (compose mitigations listed); one email per prospect — follow-ups
    included. (The old "test-email success path records `resend_id`
    null" bullet was removed: fixed by `c17ede9`.)
17. **What it becomes after the hackathon** — the same loop runs the
    live prospect pipeline; rubric sharpens with real outcomes.
18. **Rules this repo lives by** — no *Suite* prices anywhere; no
    prospect contact details in the repo; never invent (source URL or
    unknown); human approves every send, except the owner-only test
    email in Settings.
19. **License** — MIT, per the license audit: LabLab's Terms of
    Use §16 require submissions to be "open source, and compliant
    with the MIT License". The README ends with `MIT — see
    [LICENSE](LICENSE).`, the repo root carries the MIT `LICENSE`
    file (Copyright (c) 2026 Md Amir Hossain), and `package.json`
    has `"license": "MIT"` and `"author": "Md Amir Hossain"`.
    "All rights reserved" appears nowhere.

## WHAT TO REMOVE — stale, overclaiming, duplicated, unjudgeable

### FALSE — remove, replace only with the corrected wording

- **F1 — `GET /api/auth/verify` in the API table.** The route exports
  only POST, takes JSON `{ "value" }`, never reads cookies; GET
  returns 405. *Replaced by:* POST-only row, labelled an internal
  middleware oracle.
- **F2 — "Nothing else sends, ever."** The Settings test email sends
  via Resend to an arbitrary address with no draft at all.
  *Replaced by:* "Nothing else sends *outreach*, ever — except the
  owner-only deliverability test email in Settings."
- **F3 — "Scoring: qwen3.8-flash-next".** Qwen is never called; it is
  only listed in `KNOWN_MODELS` as a Settings-selectable model.
  Scoring is deterministic code; reason prose uses the configured /
  default model (DeepSeek). *Removed; Qwen mentioned only as a
  selectable model.*
- **F4 — DATABASE_URL "fails fast at startup".** Failure is lazy
  (throws on first DB use, not at boot); Compose's `:?` fails fast,
  not the app. *Replaced by:* "REQUIRED — first database use fails
  without it (and Compose refuses to start without it)."
- **F5 — "Nothing in the loop runs anywhere else."** Email delivery
  runs on Resend; research fetches external prospect sites.
  *Replaced by:* "Compute and reasoning run only on Vultr; email
  delivery goes through Resend."

### EXAGGERATED — remove the overclaim, keep the true core

- **E1 — Banner scores "Verified live… reproduced from live fetches"
  (Cox Beach 80, Sundori 70, Balishira 55, Giriraj 55).** The scores
  exist only as hardcoded fixtures in `scripts/scoring-test.ts` (6/6
  pass — numbers right, provenance not). The seed DB carries zero
  scores/research; a fresh board shows 20 unscored prospects.
  *Replaced by:* "The rubric reproduces the spec's four worked
  examples (80/70/55/55) — regression test 6/6. Scores appear on the
  board only after a run." "Verified live" / "reproduced from live
  fetches" deleted.
- **E2 — "A 94-room resort running discount campaigns… is the
  clearest case in the seed data."** Room count and discount campaigns
  exist only in the test fixture, not the seed. *Replaced by:* "…in
  the worked examples."
- **E3 — Step 5 "flags the prospect for human review".** The "flag"
  is only a step-output string; no flag field, no status change.
  *Replaced by:* "…and records the follow-up for human review."
- **E4 — "A human approves every send." (unqualified).** True for
  outreach, but the Settings test email has no approval gate, and
  auto-send means the approval click IS the send. *Kept only with the
  test-email exception stated alongside it.*
- **E5 — "Docker runs the app container, the shared Postgres, and
  Caddy (TLS)."** This repo's compose runs only the app container;
  Postgres and Caddy live in separate stacks (`~/platform`, not in
  this repo); no Caddyfile in the repo. *Replaced by:* "The app
  container joins the shared platform stack (Postgres + Caddy,
  provisioned separately on the VM — see Database)."

### STALE — remove or correct

- **S1 — `docs/BUILD-SPEC.md` citations (old README:83, 266).** The
  file does not exist; `.gitignore` has `docs/*`; seven code comments
  also cite it. *README citations removed; re-pointed to
  `scripts/scoring-test.ts` and `lib/scoring.ts`. Do not invent a
  `docs/` directory. The code comments are a founder fix
  (`FIXES-FOR-FOUNDER.md` item 6).*
- **S2 — Architecture diagram lists 6 tables.** The schema has 8
  tables (the audit said 9; a direct count of `CREATE TABLE` in
  `lib/db.ts` at tip `19e5248` gives 8: prospects, runs, drafts,
  followups, settings, prospect_status_events, sends, scouts).
  The diagram also omitted Caddy and the scout queue, and a "(live
  web fetch)" line was visually attached under Resend instead of the
  app. *Diagram redrawn with all 8 tables, a scout row, and the fetch
  leg attached to the app.*
- **S3 — Dockerfile comment "All 4 runtime variables".** Compose
  passes 9. *Not a README line — code fix, `FIXES-FOR-FOUNDER.md`
  item 5.*
- **S4 — `lib/db.ts` comment "five tables".** The schema has eight
  tables. *Not a README line — code fix, `FIXES-FOR-FOUNDER.md`
  item 4.*
- **S5 — Board statuses "(New → Researched → Drafted → Contacted →
  Replied)".** Six statuses exist; Closed was omitted. *Corrected to
  include "→ Closed".*
- **S6 — "existing PMS −30".** The code's −30 fires on
  `has_booking_engine` — a booking engine, not necessarily a PMS.
  *Corrected to "existing booking engine −30", plus the exclusivity
  rules the old README omitted (dead site doesn't also get +20;
  phone/OTA rows only when no direct booking; scale = 20+ rooms OR
  3+ room types; negatives stack; clamped 0–100).*
- **S7 — "seeds the 20 batch-3 prospects when the suitescout database
  is empty".** Seeds when the `prospects` table is empty
  (`COUNT(*) == 0`). *Corrected to "when the prospects table is
  empty".*
- **S8 — "No prices anywhere… no fee figures in code, drafts, docs,
  or the UI."** The old README itself printed fee figures ($0.15 in
  / $0.60 out, $0.10 / $0.20, $200 hackathon credits).
  *Narrowed to "No *Suite* prices anywhere."*
- **S9 — `POST /api/prospects` "Add a prospect (name, website,
  location)".** The route requires at least one of the three.
  *Corrected to "Add a prospect (any of name, website, location; at
  least one)."*
- **S10 — Title "SuiteScout — the resort sales-ops agent" (old
  README:1).** Ambiguous — reads as sales-ops FOR a resort, while
  the product sells the Resort PMS to resorts. *Replaced by the
  locked submission title "SuiteScout — ViveReply's Resort PMS sales
  agent" + the locked tagline "Resort PMS sales-ops".*
- **S11 — "The whole app (every page + every API route) sits behind
  a session login".** Since `6528edd` the landing page `/` and
  `/og-image.png` are public. *Corrected to list the public
  exceptions and the post-login landing on `/board`.*
- **S12 — UI tour "Live at … (log in first): /login → board".** The
  board moved to `/board` and the landing page comes first.
  *Corrected to landing → login → board at `/board`.*
- **S13 — "A fresh board shows 20 unscored prospects" (status note,
  unqualified).** True only of a fresh empty database (the seed is
  20, unscored). The live board shows 29 prospects as of 2026-11-08,
  all researched, scored, and drafted. *Corrected to state the seed
  rule and the live-board state separately, with the date.*
- **S14 — OG image "carries the old tagline" (README feature-image
  section).** The file in the repo as `public/suitescout-og-image.png`
  is the new-tagline 1200×630 PNG (87,690 bytes). *Corrected: only
  the rename to `public/og-image.png` is done; only the VM rebuild remains.*
- **S15 — "Video MISSING / screenshots MISSING" (checklist).** The
  video is filmed and edited (https://youtu.be/4V5lu60qQC8) and the
  five screenshots are taken. *Corrected: video DONE, screenshots
  "in the repo at public/screenshots/".*
- **S16 — Settings auto-send explainer "never more than 20 emails
  per 24 hours".** The enforced cap is 10/day (`DAILY_SEND_CAP`
  default 10, `lib/email.ts`); the Settings string is stale.
  *Never quoted in the README or the submission. Parked copy fix in
  `FIXES-FOR-FOUNDER.md`.*
- **S17 — "The one-email-per-approved-draft guard is real"
  (Current limitations).** The struck F6 phrasing survived in the
  limitations section — the guard is one email per prospect, total.
  *Corrected to "one-email-per-prospect".*

### UNVERIFIED — remove, do not assert as fact

- **VM specs "Ubuntu 24.04, 2 vCPU / 4 GB".** No source in the repo.
  *Removed; instance size is whatever the Vultr console shows.*
- **Model prices / context sizes ("$0.15 in / $0.60 out", "1M
  context", "256K context").** No source in the repo. *Removed
  entirely — no price or context figure appears in the new README.*
- **"$200 hackathon credits".** No source in the repo. *Removed.*
- **Live VM counts.** None stated anywhere in the new docs, except
  the dated live-board state (29 prospects, 107 drafts, 37
  follow-ups, 37 runs) read directly off the 2026-11-08 board
  screenshot.
- **Rollback claim ("previous commit reads SQLite again").**
  Unverifiable from a shallow clone. *Kept only softened: stated as
  design intent, explicitly not re-verified.*
- **Dockerfile "next build only imports modules, every env access
  lazy".** Plausible but the build was not run. *Dropped.*
- **Demo-login submission link.** No submission file exists in the
  repo; the password is correctly absent. *Wording kept ("password
  from the submission") with no invented link.*
- **YouTube link fetch check.** The video URL was pasted by the
  founder from his own upload; an independent fetch of the page was
  rate-limited (HTTP 429) and not retried. The founder confirms it
  plays before filing.

### UNJUDGEABLE / UNFOLLOWABLE — remove and rewrite

- **"Run locally" as written.** Omitted the Postgres prerequisite
  entirely; the `DATABASE_URL` example used hostname
  `platform-postgres`, which only resolves inside the VM's Docker
  network (a judge on a laptop gets an error on first use); no
  local-Postgres alternative; no Node/pnpm version, yet
  `node scripts/scoring-test.ts` needs Node ≥22.6 while the
  Dockerfile pins Node 20. *Replaced by the full Quick start with a
  local Postgres path and both Node versions stated.*
- **"Deploy" as written.** Omitted creating the external
  `vivescript-net` network and the `platform-postgres` stack itself
  (fresh VM: compose fails on the missing external network); the
  Caddy/HTTPS step was undocumented (no Caddyfile in repo);
  "install Docker + Compose" had no commands. *Replaced by the full
  Deploy section naming everything outside the repo.*
- **"UI tour (live at the demo URL)" with no link.** The demo URL
  appeared only later in the file. *Replaced by a linked demo URL at
  the top and in the UI tour, plus marked screenshot placeholders.*
- **"Screenshots section" as a text-only "UI tour" paragraph.**
  *Replaced by real embeds with one-line captions; no screenshots
  faked, no placeholder markers.*
- **Any license claim.** *Replaced by the placeholder
  `<!-- LICENSE: pending decision — see SUBMISSION-CHECKLIST.md -->`
  pending the separate license audit.*
- **Duplicated seed paragraphs** (old README repeated the first-boot
  seeding story in both "Run locally" and "Deploy"). *Consolidated:
  seeding is stated once in Quick start and once as the reference
  rule in Database / Fresh deploy.*
- **"Drafts ready" numbers.** The count includes sent drafts
  (`lib/db.ts` counts all statuses). *No drafts-ready number is
  cited anywhere in the new docs — except the live-board state in
  the status note, which reads the number off the board screenshot
  (107 drafts ready, awaiting-approval count per the fixed
  `countDrafts()`), dated 2026-11-08.*

## RE-VERIFICATION ADDENDUM (tip `c17ede9` + re-inspection pass)

A second agent re-checked every claim above against the code at
`c17ede9` (which landed `FIXES-FOR-FOUNDER.md` items 1–6) and found
the audit accurate, plus the following:

- **F6 (new FALSE) — "one prospect gets one email per approved
  draft".** The guard is `hasEmailSendForProspect`: one email per
  prospect *total*, however triggered — a second approved draft for
  the same prospect cannot send either. *Corrected in the README
  ("one email per prospect, however triggered") and added to
  "Current limitations" (the guard blocks follow-up emails until it
  learns a follow-up exception).*
- **Stale limitation removed.** The "Test-email audit gap" bullet
  was fixed by `c17ede9` (success path now records `resend_id:
  data.id`) but still listed as a limitation. *Removed.*
- **Founder-fix item 9 elevated to pre-submission.** The login page
  ("Owner access only…", explains nothing) is the first screen a
  judge sees; leaving it parked until after judging was backwards.
  *Reworded pre-submission: one product line + demo-login welcome.*
- **New UI contradiction fixed.** The Settings model label read
  "Qwen 3.8 Flash Next — scoring / classification" while the README
  truthfully says Qwen is not used for scoring. *Label trimmed to
  the model name.*
- **Fixture hygiene.** Phone-like test fixtures (`01766557760`)
  looked plausibly real. *Now `01700000000`-style; 35/35 checks
  still pass. The README's "no real prospect contact details" rule
  now matches the repo literally.*
- **`backups/` gitignored.** Nightly DB dumps can no longer be
  committed by accident.
- **Checklist + fixes statuses synced.** `SUBMISSION-CHECKLIST.md`
  and `FIXES-FOR-FOUNDER.md` now record landed-vs-parked status at
  this tip instead of describing a push from a polish folder.
- **Battery re-run at the new tip:** `tsc` clean, `pnpm build`
  green, scoring 6/6, ui-proof 35/35 pure — the first validation of
  the `c17ede9` lib changes.

## REFRESH ADDENDUM (tip `af8d121`, 2026-11-08)

- **Locked title + tagline.** Submission title is now "SuiteScout —
  ViveReply's Resort PMS sales agent" (47 chars) with the locked
  tagline "Resort PMS sales-ops" (founder, 2026-11-08).
  The old title is on the remove list as S10; it appears nowhere in
  the refreshed README.
- **Landing route (`6528edd`).** `/` is the public landing page,
  `/board` is the board, login lands on `/board`. Include items 2,
  9, 15 and remove items S11, S12 updated accordingly. Verified
  live 2026-11-08 ~12:31.
- **OG image.** The correct 1200×630 image is in the repo as
  `public/suitescout-og-image.png` (verified by blob SHA — the
  498×261 preview uploaded earlier was replaced by the founder in
  `af8d121`); the rename to `public/og-image.png` is done +
  a rebuild before the metadata path resolves. The README states
  this status honestly; nothing in the docs claims the image is
  already serving.
- **Include-list corrections.** Item 8: "one-email-per-approved-
  draft" was the struck F6 claim — corrected to one-email-per-
  prospect (total). Item 16: the `resend_id` bullet was already
  fixed by `c17ede9` and is removed here; the `/api/health` bullet
  updated for the public landing page.
- **Docs synced.** `SUBMISSION-CHECKLIST.md` and
  `FIXES-FOR-FOUNDER.md` re-synced to this tip (landing route,
  inference-comment fix, OG-image rename step, LabLab Step 1
  status).

## FINAL ADDENDUM (tip `3dcb1e3`, 2026-11-08)

Every load-bearing README claim was re-read from the code at this
tip before finalising: rubric (`lib/scoring.ts`, all eight rows,
exclusivity, clamp, bands), send cap default 10 / max 100 / rolling
24h / successful sends only (`lib/email.ts:47-56`,
`lib/db.ts:731-739`), one-email-per-prospect guard
(`lib/email.ts` `hasEmailSendForProspect`), test-email cap exemption
(`lib/email.ts` `sendTestEmail`, channel `test`), 8 tables
(`lib/db.ts:37-108`), 12h HMAC sessions + HttpOnly + Secure in
production (`lib/session.ts`, login route), throttle 20 failed / 10
min → 429 (login route), middleware public list (`middleware.ts`),
batch cap 25 (`app/api/runs/batch/route.ts`), OSM scout
(Nominatim limit=1, Bangladesh only → Overpass tourism candidates,
`lib/geo.ts`), research fetch (website + research sources incl.
Facebook page / listing URLs, `lib/research.ts:2-3,395-396`), seed
20 prospects with the demo trio Sundori / Cox Beach / Balishira
(`lib/seed.ts`), fixtures 80/70/55/55 (`scripts/scoring-test.ts`),
selectable models incl. GLM 5.3 Flash + MiMo V2.6 Flash
(`lib/inference.ts:14-25`). No claim was softened or removed in this
pass — two were corrected (S13, S17) and one was widened (item 7:
the selectable-models list now names GLM + MiMo alongside Qwen).

- **Video linked.** The Demo video section is new (include item 2):
  the YouTube link appears exactly once in the README. The video
  was edited from the founder's 4:22 take (2:27, 1920×1160, fresh
  narration, password dropdown cut, Approve-only). The run trace it
  shows is Run #37 Sreemangal — the README and the video section
  name it as Sreemangal's run, never Balishira's.
- **Screenshots are real embeds.** Include item 15 changed from
  placeholders to real embeds with one-line captions (01-login,
  02-board, 03-prospect-detail, 04-run-trace, 05-settings). The
  staged files were opened and read before captioning: the board
  shows 29 prospects / 107 drafts / 37 follow-ups; Balishira is 55
  Warm live; the trace is Sreemangal Run #37, 30 Cold; Settings
  shows the configured keys, auto-send off, and the agent defaults.
  **Found issue:** the viewport file sent as `01-login.png` is a
  second copy of the landing page, not the login form — the real
  login capture is the full-page `01-login_full.png`, which must be
  uploaded as `public/screenshots/01-login.png` (checklist item 1). The
  README caption describes the login form, so the upload must match
  it before the docs are pushed.
- **OG image status corrected (S14).** The file in the repo is the
  new-tagline PNG (87,690 bytes); only the rename remains.
- **Live-board state (S13).** "Twenty prospects" is stale everywhere
  it appears as a live count — the seed is 20, the live board is 29.
  The README now states both, dated.
- **Settings "20 emails" string (S16).** Stale against the enforced
  10/day cap; never quoted in the README or the submission. The
  Settings screenshot shows it in passing; its caption does not draw
  attention to it. Parked as a one-line copy fix after judging.

## POST-SUBMISSION ADDENDUM (filed 2026-11-08, tip `9ab13da`)

Submitted with the video (2:27, https://youtu.be/4V5lu60qQC8), five
screenshots, OG cover, pitch deck, and demo login. The
post-submission inspection (landing page read end-to-end, all 7
explore links fetched live, both questioned screenshots opened)
found the filing accurate except the following, all fixed in `main`
on top of the submission tip (landing-copy items need one VM
rebuild to go live):

- **F7 — Landing rubric "Modern PMS already in place" (−30).**
  The code fires on `has_booking_engine` — a reintroduction of
  struck claim S6. *Corrected to "Booking engine already in
  place".*
- **F8 — Landing "the agent never sends on its own" (+ "it never
  sends itself" on the follow-up card).** Third resurrection of the
  purged "never sends" wording; auto-send fires at approval.
  *Reworded to the README standard: nothing sends from an
  unapproved draft + the owner-only test-email exception stated;
  follow-up card now says "no scheduled sending".*
- **F9 — Landing scout list named Cox's Bazar.** The scout refuses
  it (Nominatim returns only the district) — falsifiable live in 30
  seconds. *Reduced to verified-with-data examples (Saint Martin's
  Island, Sreemangal).*
- **F10 — Landing "Nightly database backups, with a verified test
  restore".** Backups run; no restore test is on record.
  *Dropped to "Nightly database backups" pending founder
  confirmation of a restore test.*
- **F11 — Landing "10-sends-per-day cap" vs live Settings showing
  20.** The VM runs `DAILY_SEND_CAP=20` and Settings renders the
  live value — the landing's pinned 10 contradicted it (this also
  closes S16/FIXES-#24 as a false alarm: the Settings string was
  never hardcoded). *Landing depinned to "daily send cap (Settings
  shows the live value)". Standing rule: 10 is the code default, 20
  is the live VM value — never quote either without saying which.*
- **Stale "until the rebuild, 404s" (README + BRAND.md).**
  `/og-image.png` verified 200 (87,690 bytes) post-submission.
  *Both paragraphs now state it serves live.*
- **`05-settigns.png` typo renamed** to `05-settings.png` (+ README
  reference). No live references remain anywhere — only
  renamed-from notes in the docs' history sections.
- **Still open (founder-owned):** `01-login.png` is a landing
  duplicate, not the login form (verified by opening the file) —
  the planned swap never happened. The README caption describes
  the login form. Fix: capture `/login`, replace the file,
  re-render deck slide 4.
- **Verified clean:** all 7 landing explore links return 200; no
  `docs/`, `.env`, `backups/`, video, or build artifact is tracked;
  the tracked tree contains nothing a judge should not see.
