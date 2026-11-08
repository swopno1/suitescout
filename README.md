# SuiteScout — ViveReply's Resort PMS sales agent

*Resort PMS sales-ops.*

ViveReply sells its Suite (Resort PMS + direct-booking website) **to
resorts**. Finding those resorts, checking whether they need the Suite,
and writing the first message is slow, manual work — the founder does
it by hand today. SuiteScout does the boring parts: it researches a
prospect resort, scores it against a fixed rubric, drafts the first
message, logs everything on a board, and drafts the follow-up. A human
approves every outreach send.

Live demo: **https://suitescout.vivereply.com** — the public landing
page tells the story (ViveReply sells the Resort PMS; SuiteScout finds
the resorts that need it). Open the live demo from the landing page and
log in with the demo login published in the LabLab submission
(username `demo`; the password is in the submission, not in this repo).
The prospect board lives at `/board` after login. See
[Login](#login).

> **Status.** The five-step loop runs for real — live fetch +
> extraction, deterministic rubric scoring, LLM drafting (template
> fallback when no inference key is set), board logging, follow-up
> drafting. The rubric reproduces the four worked examples in
> `scripts/scoring-test.ts` — The Cox Beach Resort 80 Hot, Sundori Eco
> Resort 70 Hot, Balishira Resort 55 Warm, Giriraj Resort 55 Warm —
> and the regression test passes 6/6 (`node scripts/scoring-test.ts`).
> Those scores come from the test fixtures, not from live board data:
> the seed database carries no scores or research, so a fresh board
> shows 20 unscored prospects and scores appear only after a run.

## The five-step loop

1. **Research** — fetches a prospect resort's live public web presence
   (website, Facebook page, listings) and extracts facts. Every fact
   cites its source URL; unverifiable facts stay "unknown".
2. **Score** — applies a deterministic 0–100 rubric (see below). The
   rules compute the score; the model writes the reasons.
3. **Draft** — writes a personalised first-touch email + WhatsApp
   opener built on one genuine observation about the property. No
   *Suite* prices, no fake scarcity, no invented features.
4. **Log** — writes the prospect, run, score and drafts to a CRM board
   (New → Researched → Drafted → Contacted → Replied → Closed).
5. **Follow up** — drafts the follow-up (due in 3 business days by
   default; Friday and Saturday are the weekend) and records the
   follow-up for human review. Nothing sends the follow-up on its own —
   see [Current limitations](#current-limitations).

**A human approves every outreach send.** Email sends only from an
approved draft — a manual Send click, or at approval time when
auto-send is on and the lead qualifies (hot band, researched email,
pre-contact stage). The one exception is the owner-only deliverability
test email in Settings (`POST /api/settings/test-email`), which sends
to an address the owner types in, with no draft and no approval step.
It is cap-exempt and recorded in the sends table.

The problem it solves: resorts with no direct booking lose guests —
and margin — to OTAs and third-party sellers. In the worked examples,
the clearest case is a 94-room resort running discount campaigns with
a dead domain and no owned booking channel (The Cox Beach Resort, 80
Hot). That room count and those campaigns are fixture facts in the
worked examples, not seed data.

## Scoring rubric

Deterministic code in `lib/scoring.ts`, not vibes. The model explains;
the rules score.

| Signal | Points |
|---|---|
| No working website (dead, none, or hijacked) | +30 |
| Live website but no booking engine | +20 |
| Bookings by phone / WhatsApp / Facebook only | +15 |
| Dependent on OTAs / third-party sellers | +15 |
| Demand signals (campaigns, reviews, peak-season demand) | +10 |
| Scale — 20+ rooms, or 3+ distinct accommodation types | +10 |
| Already has working direct booking | −40 |
| Already runs a booking engine | −30 |

Bands: **70+ Hot, 40–69 Warm, under 40 Cold.**

Exclusivity rules, as coded:

- A dead site gets +30 and does **not** also get the +20 "no booking
  engine" row — that row is for a live site with no engine.
- The phone-only (+15) and OTA-dependent (+15) rows apply only when
  the property has **no** direct booking — "only" and "dependent"
  exclude a working direct channel.
- Scale is 20+ rooms **or** 3+ room types.
- The two negative rows stack. The total is clamped to 0–100.

Worked examples (fixtures in `scripts/scoring-test.ts`, 6 cases,
6/6 passing): Cox Beach 80 Hot, Sundori 70 Hot, Balishira 55 Warm,
Giriraj 55 Warm — plus a direct-booking property clamped to 0 Cold
and a bare brochure site at 20 Cold. Run it with
`node scripts/scoring-test.ts` (needs Node ≥22.6 for TypeScript type
stripping; see [Quick start](#quick-start-local)).

## Architecture

```
Browser
  │  (Next.js App Router — one service)
  ▼
SuiteScout on a Vultr Cloud Compute VM (Docker)
  ├─ Next.js UI + API routes (one container — all this repo's
  │    compose file runs; see "Deploy" below)
  ├─ PostgreSQL 16 — shared platform-postgres on vivescript-net
  │    (provisioned separately in ~/platform, not in this repo)
  │    Tables (8): prospects, runs, drafts, followups, settings,
  │    prospect_status_events, sends, scouts. Scout queue: a scout row
  │    tracks geocode → search → import for each area scout.
  ├─ Vultr Serverless Inference (OpenAI-compatible)
  │     https://api.vultrinference.com/v1
  │     Default model: deepseek-v4.1-flash-1017. Scoring itself is
  │     deterministic code; the configured model writes the reason
  │     prose. (Qwen 3.8 Flash Next appears in Settings as a
  │     selectable model; it is not used for scoring.)
  ├─ Resend — outbound email (manual Send + qualified auto-send,
  │    plus the owner-only test email)
  └─ Live web fetch — the research step fetches the prospect's
       public website / Facebook / listings at run time
  ▼
Prospect resort's public website / Facebook / listings
```

## Vultr services used

| Service | Role |
|---|---|
| **Vultr Cloud Compute** (VM, Docker host) | The control layer and the host. This repo's compose file runs only the app container; the shared Postgres and Caddy (TLS) live in the separate platform stack on the same VM — see [Database](#database-postgresql) and [Deploy](#deploy-docker-on-the-vultr-vm). Instance size is whatever the Vultr console shows for this VM. |
| **PostgreSQL 16** (self-hosted `platform-postgres` on the VM) | The shared database for SuiteScout (and the demo apps) — one `suitescout` database on the internal `vivescript-net` network. Replaces the old per-app SQLite file. |
| **Vultr Serverless Inference** | Every LLM call (research + drafting + reason prose), via a plain `fetch` against the OpenAI-compatible `/v1/chat/completions` endpoint. Without a key the app still runs: drafts fall back to templates built from the rubric reasons. |

Compute and reasoning run only on Vultr. Email delivery goes through
Resend, and research fetches the prospect's public sites — those are
the only legs that leave the VM.

## How the agent executes real tasks

- **Live fetch, not canned data.** Research hits the prospect's real
  website and pages at run time. If a site is dead, the agent records
  it as dead — with the URL it tried.
- **Deterministic scoring.** The rubric is code; the worked examples
  in `scripts/scoring-test.ts` are the regression test.
- **Evidence receipts.** The run trace shows every step with its source
  URLs, so a human can verify each claim the agent makes.
- **Human gate.** Drafts sit at `draft` until a human approves them
  (`POST /api/drafts/:id/approve`). Email sends only from an approved
  draft — a manual Send click, or immediately at approval when the
  lead qualifies and auto-send is enabled. The only other send is the
  owner-only test email in Settings.
- **Sending limits.** Outreach is capped at 10 sends per rolling 24
  hours by default (`DAILY_SEND_CAP`, max 100). A draft that was
  already sent cannot send again, and a prospect that already
  received an email cannot receive another — one email per prospect,
  however triggered (that guard currently also blocks follow-up
  emails — see Current limitations). Outgoing mail carries a
  `List-Unsubscribe` mailto header and a reply-STOP footer.

## Login

Every page and API route sits behind a session login at `/login` —
one shared login, username `demo`, password from `APP_PASSWORD` in
`.env` — except the public landing page at `/` and its OG image
(`/og-image.png`). Sessions are HMAC-signed cookies (12h,
HttpOnly, Secure in production) with a Log out button in the header.
If `APP_PASSWORD` is unset or empty nobody can log in (fail closed,
never open); rotating it logs everyone out at once. Login attempts are
throttled: 20 failed attempts per IP per 10 minutes, then HTTP 429.

Middleware protects every page and API route except `/`, `/login`,
`/api/auth/login`, `/api/auth/verify`, `/_next/`, `/brand/`,
`/favicon.ico` and `/og-image.png`. Unauthenticated visits to a
protected page redirect to `/login` (with `?next=` back to that page —
after login you land on the board at `/board`); unauthenticated API
calls get JSON 401.

```bash
# On the VM, after editing .env (set APP_PASSWORD to a strong value):
docker compose up -d   # recreate so the container picks up the new env
# (plain `docker compose restart` does NOT reload .env)
```

Judges use the demo login published in the submission (`demo` + the
password from the submission). Never commit `.env`.

## Quick start (local)

Prerequisites: **Node 20** (the app; the Dockerfile pins Node 20 and
`package.json` pins pnpm 12.16.1), **pnpm**, and **PostgreSQL 16** —
local or in Docker. The app needs a real Postgres; there is no
SQLite mode any more. Note the two Node versions honestly: the app
runs on Node 20, but `node scripts/scoring-test.ts` needs
**Node ≥22.6** (TypeScript type stripping) — use a newer Node, e.g.
via nvm, just for that script.

```bash
# 1. PostgreSQL — local option (Docker):
docker run --name suitescout-pg -e POSTGRES_PASSWORD='<password>' \
  -e POSTGRES_DB=suitescout -p 5432:5432 -d postgres:16-alpine
# (Or point DATABASE_URL at any Postgres 16 you already run.)

# 2. Configure:
cp .env.example .env
# In .env, set DATABASE_URL to YOUR Postgres, e.g.:
# DATABASE_URL=postgresql://postgres:<password>@localhost:5432/suitescout
# The platform-postgres hostname in .env.example only resolves inside
# the VM's Docker network — it will not work on a laptop.
# APP_PASSWORD is required to log in; the inference and Resend keys
# are optional (no key = template drafts, no sending).

# 3. Run:
pnpm install
pnpm dev            # http://localhost:3000
```

First boot creates the schema (`CREATE TABLE IF NOT EXISTS`) and,
when the `prospects` table is empty, seeds the 20 batch-3 resorts
(source: the founder's own lead research, 2026-10-17 — names,
websites and locations only, plus public listing URLs on four
prospects; no contact details). A database that already has prospects
is never re-seeded. The demo trio — The Cox
Beach Resort, Sundori Eco Resort, Balishira Resort — is flagged DEMO
on the board: DEMO means a seeded demo prospect used in the
walkthrough video.

## Deploy (Docker, on the Vultr VM)

```bash
# On the VM: install Docker Engine + the Compose plugin first
# (https://docs.docker.com/engine/install/ubuntu/), then:
cd ~/suitescout
cp .env.example .env   # add VULTR_INFERENCE_API_KEY, APP_PASSWORD,
                       # DATABASE_URL + Resend vars (see Environment)
docker compose up -d --build
# App on http://<vm-ip>:3000 (or https://suitescout.vivereply.com via Caddy).
# Data lives in the shared platform-postgres — no local volume anymore.
# First boot creates the schema and seeds the 20 batch-3 prospects
# when the `prospects` table is empty (see "Database" below).
```

Three things live **outside this repo** and must already exist on the
VM — this repo's compose file cannot create them:

1. **The `vivescript-net` network** (external). Create it once:
   `docker network create vivescript-net` — a fresh VM's
   `docker compose up` fails on the missing external network without it.
2. **The platform stack (`~/platform`)**: `platform-postgres`
   (Postgres 16, database `suitescout`) and Caddy, which terminates
   TLS for https://suitescout.vivereply.com. There is no Caddyfile in
   this repo; Caddy is provisioned separately on the VM.
3. **The `suitescout` database user** — see
   [Provisioning](#provisioning-one-time-on-the-vm).

On a first deploy after the SQLite → Postgres move, run the
migration (`pnpm db:migrate-sqlite`) BEFORE the app's first start —
first boot seeds the 20 prospects, and the migration then aborts as
non-empty (recover with `--force`). See "Migrating the old SQLite
data" under "Database" below. Stop the app before migrating so the
SQLite WAL checkpoints into the main file; do not copy the `.db`
file on its own.

## Database (PostgreSQL)

The app stores everything in the **shared platform-postgres**
(Postgres 16, container `platform-postgres`, network `vivescript-net`)
on the same VM — database `suitescout`. There is no SQLite file
anymore; the only SQLite left in the repo is the one-off migration
script below. Schema (8 tables, created with
`CREATE TABLE IF NOT EXISTS` on first boot): `prospects`, `runs`,
`drafts`, `followups`, `settings`, `prospect_status_events` (the
per-prospect timeline), `sends` (every send attempt, including test
emails), `scouts` (area-scout jobs and their progress).

### Provisioning (one time, on the VM)

The `suitescout` database already exists. Create its user once:

```bash
cd ~/platform
docker exec platform-postgres psql -U postgres -c \
  "CREATE USER suitescout WITH PASSWORD '<strong-password>';"
docker exec platform-postgres psql -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE suitescout TO suitescout;"
docker exec platform-postgres psql -U postgres -d suitescout -c \
  "GRANT ALL ON SCHEMA public TO suitescout;"
```

Then set `DATABASE_URL` in `~/suitescout/.env` (same password):

```
DATABASE_URL=postgresql://suitescout:<password>@platform-postgres:5432/suitescout
```

### Migrating the old SQLite data

The old app kept its data in `./data/suitescout.db` on the VM. Copy
it into Postgres with the migration script (run on the VM, where both
the `.db` file and Postgres are reachable). Build the new image
first — the script ships in it:

```bash
cd ~/suitescout
docker compose build
docker compose run --rm -v "$PWD/data:/data" suitescout \
  pnpm db:migrate-sqlite --sqlite /data/suitescout.db
docker compose up -d
```

The script copies all five tables (prospects, runs, drafts,
follow-ups, settings) in one transaction, preserving ids, and resets
each identity sequence to `MAX(id)`. It aborts if the Postgres tables
are not empty — pass `--force` to TRUNCATE and copy anyway. It does
not seed; the app seeds on first boot when `prospects` is empty.

### Fresh deploy / re-seed

On first boot the app creates the schema (`CREATE TABLE IF NOT
EXISTS`) and, when the `prospects` table is empty, seeds the same 20
batch-3 prospects as before (see `lib/seed.ts`). So a fresh empty
database re-seeds itself — no manual step. A database that already
has prospects is never re-seeded.

### Rollback

- The old SQLite file `./data/suitescout.db` stays on the VM as the
  rollback copy — do not delete it.
- To roll back the app: check out the previous commit in
  `~/suitescout` (`git checkout <previous-commit>`), then
  `docker compose up -d --build` — the old build reads the SQLite
  file again. Postgres data is untouched by the rollback. (This path
  is the design intent; it has not been re-verified from the current
  checkout.)

## Environment

| Variable | Purpose |
|---|---|
| `VULTR_INFERENCE_API_KEY` | Vultr Serverless Inference API key (required for LLM calls; unset = template drafts). |
| `VULTR_INFERENCE_MODEL` | Default model id (default `deepseek-v4.1-flash-1017`). |
| `DATABASE_URL` | PostgreSQL connection string — REQUIRED. First database use fails without it; in Docker, Compose also refuses to start without it (`${DATABASE_URL:?}`). `postgresql://suitescout:<password>@platform-postgres:5432/suitescout` on the VM; `postgresql://<user>:<password>@localhost:5432/suitescout` locally. |
| `APP_PASSWORD` | Login password (session login at `/login`, username `demo`). Unset/empty = nobody can log in. |
| `RESEND_API_KEY` | Resend API key — unset = sending stays off, approve stays manual. |
| `RESEND_FROM_EMAIL` | Sender address (default `amir@mail.vivereply.com` — verify the domain in Resend first). |
| `RESEND_FROM_NAME` | Sender display name (default `Md Amir Hossain`). |
| `AUTO_SEND_ENABLED` | `true` = approving a qualified email draft sends it immediately. Default `false`. |
| `DAILY_SEND_CAP` | Rolling-24h outreach send cap (default `10`, max `100`). Test emails do not count against it. |

Compose-only: `TZ=Asia/Dhaka` is set in `docker-compose.yml` (not an
app variable).

## API

All routes except the login/verify pair require a valid session (see
[Login](#login)).

| Route | Purpose |
|---|---|
| `GET /api/prospects` (+ `?status=` `?band=`) | List prospects. |
| `POST /api/prospects` | Add a prospect — any of `name`, `website`, `location`; at least one is required. |
| `GET /api/board` | Kanban columns + counts. |
| `POST /api/runs` | Queue a run for a prospect — runs the 5-step loop (research → score → draft → log → follow-up). 409 when one is already active. |
| `POST /api/runs/batch` | One run per New prospect (cap 25, skips active). |
| `GET /api/runs/:id` | Run trace (steps + evidence + status). |
| `PATCH /api/prospects/:id` | Update prospect status. |
| `GET /api/prospects/:id/evaluate` | Rules verdict on the lead's position (+ LLM summary when keyed). |
| `POST /api/scout` | Queue an area scout (202): place name → background geocode → search → import. Watch it on `/scout?id=…`. |
| `GET /api/scouts` | Recent scouts (history). |
| `GET /api/scouts/:id` | One scout + its imported prospects (live progress). |
| `POST /api/drafts/:id/approve` | Human approval gate for a draft (auto-sends when qualified + enabled). |
| `POST /api/drafts/:id/send` | Manual Send of an approved email draft. |
| `POST /api/drafts/:id/sent` | Record an approved draft as sent outside the app. |
| `GET/POST /api/settings` | Inference model + follow-up delay. |
| `POST /api/settings/test` | Live inference connection check. |
| `POST /api/settings/test-email` | Owner-only deliverability test email (cap-exempt, recorded in the sends table). |
| `POST /api/auth/login` / `POST /api/auth/logout` | Session login / logout. |
| `POST /api/auth/verify` | Internal session oracle for the middleware: POST only, JSON body `{ "value": "<cookie>" }`, returns `{ "valid": true/false }` and nothing else. GET returns 405. Not a public session check. |

## UI tour

Live at https://suitescout.vivereply.com: the public landing page at
`/` → "Open live demo" → branded `/login` → pipeline board at
`/board` with area scout + search → prospect detail (timeline, score,
drafts, follow-ups, evaluate) → run view with live step trace →
settings (AI connection, email sending, data overview).

### Screenshots

<!-- TODO (founder): replace each placeholder below with a screenshot
     taken from the live board after logging in. Suggested files, at
     the repo root under screenshots/ (NOT under docs/ — docs/* is
     gitignored, so screenshots placed there can never be committed):
     screenshots/01-login.png, screenshots/02-board.png,
     screenshots/03-prospect-detail.png, screenshots/04-run-trace.png,
     screenshots/05-settings.png. The same files go into the LabLab
     submission. No screenshots exist in the repo yet — do not ship
     this section with images you have not taken. -->

- Login — `screenshots/01-login.png` *(placeholder — founder to add)*
- Pipeline board — `screenshots/02-board.png` *(placeholder — founder to add)*
- Prospect detail — `screenshots/03-prospect-detail.png` *(placeholder — founder to add)*
- Run view, live step trace — `screenshots/04-run-trace.png` *(placeholder — founder to add)*
- Settings — `screenshots/05-settings.png` *(placeholder — founder to add)*

### Feature image (OG image)

The landing page's feature image is `public/og-image.png` (1200×630,
brand-exact — the same file used as the LabLab cover and the YouTube
thumbnail). Status at this writing: the file in the repo as
`public/suitescout-og-image.png` IS the correct 1200×630 PNG
(commit `af8d121`) — but it carries the old tagline. Upload the
new-tagline PNG as `public/og-image.png` and delete the old-named
file, then rebuild, before the metadata path (`/og-image.png`)
resolves — until then that path 404s.

## Current limitations

Stated plainly, because a judge will find them anyway:

- **No scheduled sending.** Follow-ups have a due date; nothing ever
  fires them. Sending always starts with a human click (or an
  approval, when auto-send is on).
- **No follow-up mark-done.** Follow-ups are a due date and a draft;
  there is no way to mark one done, and nothing links a follow-up
  back to its draft from the board.
- **No suppression list, no bounce/complaint webhook.** Outgoing mail
  carries a `List-Unsubscribe` mailto header, but the STOP footer —
  "Just reply STOP and you won't hear from us again" — has no
  mechanism behind it: no inbox is processed and no suppression table
  exists, so a STOP reply currently does nothing. The one-email-per-
  approved-draft guard is real, but it is not a suppression list.
- **No `/api/health` endpoint.** The compose healthcheck probes `/`,
  which now serves the public landing page (200) — it confirms the
  app serves, but there is still no dedicated health route.
- **No non-root user in the container.** The Dockerfile runs as root;
  the compose file mitigates with `cap_drop: ALL`,
  `no-new-privileges: true`, `mem_limit: 1G` and `pids_limit: 128`.
- **One email per prospect — follow-ups included.** The guard that
  stops duplicate outreach also blocks a second email to the same
  prospect, so follow-up emails cannot go out until the guard learns
  a follow-up exception.

## What it becomes after the hackathon

SuiteScout stays the founder's sales machine: the same loop runs the
live prospect pipeline — new resorts in, researched + scored + drafted,
human-approved outreach out. Every run makes the board more valuable,
and the rubric gets sharper with each real outcome.

## Rules this repo lives by

- **No *Suite* prices anywhere.** Suite pricing is negotiated per
  project and stays private — no Suite fee figures in code, drafts,
  docs, or the UI.
- **No real prospect contact details.** No real phone numbers or
  email addresses in this repo — seed data carries names, websites,
  locations (plus public listing URLs on four), and test fixtures use
  obviously-fake numbers (`01700000000`-style).
- **Never invent.** Every agent claim needs a source URL; unknown stays
  unknown.
- **Human approves every send** — except the owner-only test email in
  Settings, which is the single deliberate exception.

## License

MIT — see [LICENSE](LICENSE).


