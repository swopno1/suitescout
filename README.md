# SuiteScout — the resort sales-ops agent

> **Scaffold status (Thu Nov 6, 2026).** This repo is the working scaffold
> for the Vultr Agent Rush Hackathon (Challenge 2, Sales Operations).
> The shell is real — board, run view, prospect detail, settings, API,
> SQLite store, Vultr inference client — but **the agent loop does not
> run yet**. Runs created now are queued stubs; research, scoring,
> drafting and follow-ups land Friday (see `docs/BUILD-SPEC.md` §14).
> Nothing here is faked as a working agent.

## What SuiteScout is

ViveReply sells its Suite (Resort PMS + direct-booking website) **to
resorts**. Finding those resorts, checking whether they need the Suite,
and writing the first message is slow, manual work — the founder does
it by hand today. SuiteScout is a sales-ops agent that does the boring
parts:

1. **Research** — fetches a prospect resort's live public web presence
   (website, Facebook page, listings) and extracts facts. Every fact
   cites its source URL; unverifiable facts stay "unknown".
2. **Score** — applies a deterministic 0–100 rubric (no working website
   +30, no booking engine +20, phone/WhatsApp-only bookings +15,
   OTA-dependent +15, demand signals +10, scale +10; existing direct
   booking −40, existing PMS −30). Bands: 70+ Hot, 40–69 Warm, under
   40 Cold. The model writes the reasons; the rules compute the score.
3. **Draft** — writes a personalized first-touch email + WhatsApp
   opener built on one genuine observation about the property. No
   prices, ever. No fake scarcity, no invented features.
4. **Log** — writes the prospect, run, score and drafts to a CRM board
   (New → Researched → Drafted → Contacted → Replied).
5. **Follow up** — drafts the follow-up (due in 3 business days) and
   flags the prospect for human review.

**A human approves every send. The agent never sends.**

The problem it solves: resorts with no direct booking lose guests — and
margin — to OTAs and third-party sellers. A 94-room resort running
discount campaigns with a dead domain and no owned booking channel is
the clearest case in the seed data.

## Architecture

```
Browser
  │  (Next.js App Router — one service)
  ▼
SuiteScout on a Vultr Cloud Compute VM (Docker, one container)
  ├─ Next.js UI + API routes
  ├─ SQLite (better-sqlite3) — prospects, runs, drafts, follow-ups
  └─ Vultr Serverless Inference (OpenAI-compatible)
        https://api.vultrinference.com/v1
  │  (live web fetch — research step)
  ▼
Prospect resort's public website / Facebook / listings
```

## Vultr services used

| Service | Role |
|---|---|
| **Vultr Cloud Compute** (Ubuntu 24.04, 2 vCPU / 2 GB) | The control layer and the host: one Docker container runs the whole app — UI, API, SQLite store. |
| **Vultr Serverless Inference** | Every LLM call. Primary: `deepseek-v4.1-flash-1017` ($0.15 in / $0.60 out per 1M tokens, 1M context) for research + drafting. Scoring: `qwen3.8-flash-next` ($0.10 / $0.20, 256K context). OpenAI-compatible endpoint, so the client is a plain `fetch` against `/v1/chat/completions`. |
| **$200 hackathon credits** | Fund the VM and inference for the build and judging window. |

Why Vultr is the centre, not just hosting: the VM plans, dispatches and
verifies every agent step, and the inference service does every piece
of reasoning. Nothing in the loop runs anywhere else.

## How the agent executes real tasks

- **Live fetch, not canned data.** Research hits the prospect's real
  website and pages at run time. If a site is dead, the agent records
  it as dead — with the URL it tried.
- **Deterministic scoring.** The rubric is code, not vibes; the worked
  examples in `docs/BUILD-SPEC.md` §5 (Cox Beach 80 Hot, Sundori 70
  Hot, Balishira 55 Warm, Giriraj 55 Warm) are the regression test.
- **Evidence receipts.** The run trace shows every step with its source
  URLs, so a human can verify each claim the agent makes.
- **Human gate.** Drafts sit at `draft` until a human approves them
  (`POST /api/drafts/:id/approve`). Nothing sends on its own.

Screenshots: _to be added once the first live run lands (Friday)._

## Run locally

```bash
cp .env.example .env   # add VULTR_INFERENCE_API_KEY
npm install
npm run dev            # http://localhost:3000
```

First boot seeds the 20 verified batch-3 resorts (source: the founder's
own lead research, 2026-10-17). The demo trio — The Cox Beach Resort,
Sundori Eco Resort, Balishira Resort — is flagged DEMO on the board.

## Deploy (Docker, on the Vultr VM)

```bash
# On the VM (Ubuntu 24.04): install Docker + Compose, then:
cp .env.example .env   # add VULTR_INFERENCE_API_KEY
docker compose up -d --build
# App on http://<vm-ip>:3000 — data persists in ./data (SQLite volume).
```

## Environment

| Variable | Purpose |
|---|---|
| `VULTR_INFERENCE_API_KEY` | Vultr Serverless Inference API key (required for LLM calls). |
| `VULTR_INFERENCE_MODEL` | Default model id (default `deepseek-v4.1-flash-1017`). |
| `DATABASE_URL` | SQLite path (default `./data/suitescout.db`). |
| `APP_URL` | Public URL of the deployed app. |

## API

| Route | Purpose |
|---|---|
| `GET /api/prospects` (+ `?status=` `?band=`) | List prospects. |
| `POST /api/prospects` | Add a prospect (`name`, `website`, `location`). |
| `GET /api/board` | Kanban columns + counts. |
| `POST /api/runs` | Queue a run for a prospect (scaffold: steps pending). |
| `GET /api/runs/:id` | Run trace (steps + evidence + status). |
| `PATCH /api/prospects/:id` | Update prospect status. |
| `POST /api/drafts/:id/approve` | Human approval gate for a draft. |
| `GET/POST /api/settings` | Inference model + follow-up delay. |

## What it becomes after the hackathon

SuiteScout stays the founder's sales machine: the same loop runs the
live prospect pipeline — new resorts in, researched + scored + drafted,
human-approved outreach out. Every run makes the board more valuable,
and the rubric gets sharper with each real outcome.

## Rules this repo lives by

- **No prices anywhere.** Suite pricing is negotiated per project and
  stays private — no fee figures in code, drafts, docs, or the UI.
- **No prospect contact details.** No phone numbers or email addresses
  in this repo (seed data carries names, websites, locations only).
- **Never invent.** Every agent claim needs a source URL; unknown stays
  unknown.
- **Human approves every send.**

Full build spec: [`docs/BUILD-SPEC.md`](docs/BUILD-SPEC.md).
