# SuiteScout README — what to include, what to remove

Source: the truth audit (Child 2) findings on tip `19e5248`. Every
FALSE / EXAGGERATED / STALE claim is on the remove list unless it was
corrected; every verified-TRUE claim and every required LabLab element
is on the include list. The rewritten `README.md` in this folder
follows the include list section-for-section, in this order.

## WHAT TO INCLUDE — final README sections, in order

1. **Title + intro** — one paragraph: what SuiteScout is, who it sells
   to (resorts), what it does (research → score → draft → log →
   follow-up), human approves every outreach send.
2. **Live demo link + login pointer** — https://suitescout.vivereply.com
   as a link; demo login is published in the LabLab submission
   (username `demo`; password in the submission, never in the README).
3. **Status note** — the five-step loop runs for real; the rubric
   reproduces the four worked examples (Cox Beach 80 Hot, Sundori 70
   Hot, Balishira 55 Warm, Giriraj 55 Warm); regression test
   `node scripts/scoring-test.ts` passes 6/6; the scores come from
   test fixtures, not live board data; the seed carries no scores or
   research, so a fresh board shows 20 unscored prospects and scores
   appear only after a run.
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
   Qwen 3.8 Flash Next is a selectable model in Settings, not used
   for scoring). No prices, no context sizes, no VM specs, no credits
   figures — none of those are verifiable from the repo.
8. **How the agent executes real tasks** — live fetch not canned data;
   deterministic scoring; evidence receipts in the run trace; human
   gate; sending limits (10/day rolling cap default, max 100;
   one-email-per-approved-draft guard; `List-Unsubscribe` mailto
   header; reply-STOP footer).
9. **Login** — session login at `/login`, username `demo`, password
   from `APP_PASSWORD`; HMAC cookie, 12h, HttpOnly, Secure in
   production; fail-closed; rotation logs everyone out; throttle 20
   failed attempts per IP per 10 min (429); middleware protects every
   page + API except `/login`, `/api/auth/login|verify`, `/_next/`,
   `/brand/`, `/favicon.ico`; `docker compose up -d` (not `restart`)
   after editing `.env`.
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
    (login → board with area scout + search → prospect detail →
    run view with live step trace → settings); five screenshots as
    explicitly marked founder placeholders
    (`screenshots/01-login.png` … `05-settings.png`, at the repo root
    — never under `docs/`, which is gitignored). No fake screenshots.
16. **Current limitations** — stated honestly, never as done features:
    no scheduled sending; no follow-up mark-done; no suppression list
    / bounce-complaint webhook and the STOP footer has no mechanism
    behind it; no `/api/health` (compose healthcheck probes `/`); no
    non-root `USER` in the Dockerfile (compose mitigations listed);
    test-email success path records `resend_id` null (one-line fix).
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

### UNVERIFIED — remove, do not assert as fact

- **VM specs "Ubuntu 24.04, 2 vCPU / 4 GB".** No source in the repo.
  *Removed; instance size is whatever the Vultr console shows.*
- **Model prices / context sizes ("$0.15 in / $0.60 out", "1M
  context", "256K context").** No source in the repo. *Removed
  entirely — no price or context figure appears in the new README.*
- **"$200 hackathon credits".** No source in the repo. *Removed.*
- **Live VM counts.** None stated anywhere in the new docs.
- **Rollback claim ("previous commit reads SQLite again").**
  Unverifiable from a shallow clone. *Kept only softened: stated as
  design intent, explicitly not re-verified.*
- **Dockerfile "next build only imports modules, every env access
  lazy".** Plausible but the build was not run. *Dropped.*
- **Demo-login submission link.** No submission file exists in the
  repo; the password is correctly absent. *Wording kept ("password
  from the submission") with no invented link.*

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
  *Replaced by explicit placeholders the founder fills from the live
  board; no screenshots faked.*
- **Any license claim.** *Replaced by the placeholder
  `<!-- LICENSE: pending decision — see SUBMISSION-CHECKLIST.md -->`
  pending the separate license audit.*
- **Duplicated seed paragraphs** (old README repeated the first-boot
  seeding story in both "Run locally" and "Deploy"). *Consolidated:
  seeding is stated once in Quick start and once as the reference
  rule in Database / Fresh deploy.*
- **"Drafts ready" numbers.** The count includes sent drafts
  (`lib/db.ts` counts all statuses). *No drafts-ready number is
  cited anywhere in the new docs.*

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
