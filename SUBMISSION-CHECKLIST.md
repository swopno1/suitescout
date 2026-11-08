# SuiteScout — founder checklist for submission

Track 02, "Powering the Future of Work". **Deadline: Mon Nov 9, 05:00
Dhaka (Sun Nov 8, 23:00 UTC)** — submit with buffer, aim Sun 18:00
UTC. Repo: `swopno1/suitescout`, branch `main`, public.

Status: the submission polish is **already in `main`**
(`1901738` README rewrite + MIT LICENSE + these docs, `c17ede9`
code fixes, `65a4f86` inference-comment fixes, `6528edd` public
landing page at `/` + board at `/board`, `4c91fa4` tagline
"Resort PMS sales-ops" in code, `81789bb` + `e46215b` docs refresh
and OG-status correction). Current tip: `538462b`
(2026-11-08 ~15:00). The video is filmed and edited, the five screenshots
are taken, and the pitch deck carries the real screenshots. What is
left is founder-only: the 01-login file swap, a VM rebuild,
pushing these final docs, and the LabLab filing itself. Total
founder work below: roughly 1.5 hours.

## Already done (verified in `main` — do not redo)

- [x] **README rewritten and truth-audited.** Every claim checked
  against the code: 8 tables, app-only compose, full env table (9
  vars), 19 verified API routes, working local + VM setup, honest
  "Current limitations". Re-verified at tip `3dcb1e3` (rubric,
  10/day cap, one-email-per-prospect guard, 12h HMAC sessions,
  batch cap 25, OSM scout, 20-prospect seed — all re-read from the
  code at this tip).
- [x] **LICENSE: MIT.** `LICENSE` at the repo root (Copyright (c) 2026
  Md Amir Hossain), `"license": "MIT"` + `"author": "Md Amir
  Hossain"` in `package.json`, README License section reads MIT.
  (LabLab Terms §16 require MIT-compliant open source.) Do not
  reintroduce "All rights reserved" anywhere.
- [x] **Code fixes 1–6** (`c17ede9`): false no-send run-trace line,
  test-email `resend_id` recording, "Drafts ready" counts
  awaiting-approval only, "five tables" → eight, Dockerfile vars
  comment, dead `docs/BUILD-SPEC.md` citations re-pointed.
- [x] **Re-inspection fixes** (committed with this checklist): login
  page welcomes the demo login and says what the product does;
  Settings model label no longer claims Qwen does scoring; test
  fixtures use obviously-fake numbers; `backups/` gitignored.
- [x] **Battery green:** `tsc` clean, `pnpm build` green, scoring
  6/6, ui-proof 35/35 pure (pg section runs on the VM).
  Re-verified at `65a4f86` (ui-proof 35/35) and for the landing
  route `6528edd` (`tsc` clean, scoring 6/6, `next build` green,
  local production run: `/` 200 public, `/board` logged-out 307,
  login → `/board`).
- [x] **Inference comments fixed** (`65a4f86`): the KNOWN_MODELS
  comment no longer implies a separate scoring model ("The scoring
  model is the cheap classifier"); it now states only one model is
  used at a time, scoring is deterministic code, and the model
  writes only the reason prose. The stale "Friday's executor"
  reference is gone too.
- [x] **Public landing page at `/`, board at `/board`** (`6528edd`,
  8 files): landing page (brand, locked tagline "Resort PMS
  sales-ops", judges band, five-step loop, rubric, guardrails,
  Vultr stack, 7 explore links, no demo password); board moved
  verbatim to `/board`; middleware PUBLIC gained `/` +
  `/og-image.png`; Nav Board→`/board` + Log in only on `/`; login
  lands on `/board`; layout metadata + corrected title. Verified
  live 2026-11-08 ~12:31 and again ~14:55: `/` returns 200 with
  the landing content, `/board` logged out → 307 to `/login`,
  `/login` 200.
- [x] **Tagline "Resort PMS sales-ops" in code** (`4c91fa4`):
  landing hero, header subtitle, login subtitle, OG alt text.
  Submission title unchanged: "SuiteScout — ViveReply's Resort PMS
  sales agent".
- [x] **Docs refresh + OG-status correction** (`81789bb`,
  `e46215b`): README title/tagline, live-demo paragraph, login
  section (public exceptions), UI tour order, checklist re-sync,
  BRAND.md tagline + feature-image + public-home sections.
- [x] **Demo video filmed + edited** (2026-11-08 ~14:12):
  2:27, 1920×1160, edited cut of the founder's 4:22 take. Opens on
  the public landing page → "Open live demo" → login as `demo` →
  board (29 prospects) → Balishira Resort (55 Warm, live) → drafts
  → Approve on camera (Approve-only, no send filmed) → run trace
  (Run #37, Sreemangal Eco Resort) → Settings. Fresh narration
  voiceover, soft music bed; the founder's unclean voiceover and
  the saved-password dropdown (which showed his other accounts)
  are cut out entirely. Link: https://youtu.be/4V5lu60qQC8
- [x] **Five screenshots taken** (2026-11-08 ~13:52, viewport
  captures 2880×1740): `01-login.png`, `02-board.png`,
  `03-prospect-detail.png`, `04-run-trace.png`, `05-settigns.png`
  (+ `00-home.png`, the landing page — not for the README).
  Uploaded to the repo at `public/screenshots/` (2026-11-08
  ~15:00). **Watch out:** the uploaded `01-login.png` is a second
  copy of the landing page, not the login form — the real login
  capture is the full-page file `01-login_full.png`, which must
  replace it as `public/screenshots/01-login.png` (item 1).
- [x] **Pitch deck re-rendered with the real screenshots**
  (2026-11-08 ~14:09): slide 4 = 01-login + 02-board, slide 5 =
  04-run-trace + 03-prospect-detail; speaker notes corrected (29
  prospects, all drafted; the trace is Sreemangal Run #37). PDF +
  PPTX under the same names. The video link is in
  (2026-11-08 ~14:56, https://youtu.be/4V5lu60qQC8); both files
  re-exported. (Slide 4's login image is the landing duplicate
  until the 01-login swap — re-render after the swap.)

## Founder work — in order

Work the items in order. Each item states its done-condition — it is
done only when that condition is met, not when the step was attempted.

### 1. Uploads + rename — DONE; VM rebuild — DO FIRST

- **OG image rename — DONE** (2026-11-08 ~15:00).
  `public/og-image.png` now exists in the repo (87,690 bytes, new
  tagline); the old-named `public/suitescout-og-image.png` is
  gone. Nothing left to upload or rename — only the VM rebuild
  (Action 3) before `/og-image.png` serves.
- **Screenshots upload — DONE, one file to swap.** The five
  screenshots are committed under `public/screenshots/`:
  `01-login.png`, `02-board.png`, `03-prospect-detail.png`,
  `04-run-trace.png`, `05-settigns.png` (note the filename typo —
  the file really is spelled `settigns`; the README references it
  as-is). **One swap remains:** the uploaded `01-login.png` is a
  second copy of the landing page, not the login form. Replace it
  with the full-page login capture (`01-login_full.png`) uploaded
  as `public/screenshots/01-login.png` (GitHub web UI: open the
  file, delete it, upload the full-page file under the same name).
  Do **not** put screenshots under `docs/` (`docs/*` is
  gitignored — files there can never be committed). Do not upload
  `00-home.png` to the repo (the landing page is already the
  README's feature image subject; the file is not referenced).
  Use the viewport versions (not the full-page alternates) for the
  LabLab submission too — the full-page `03-prospect-detail`
  alternate shows prospect phone numbers in plain text below the
  fold; the viewport versions show none.
- **Action 3 — VM rebuild.** On the VM, from `~/suitescout`:
  `git pull --ff-only` then `docker compose up -d --build`.
  Then verify:
  1. `curl -s -o /dev/null -w "%{http_code}\n" https://suitescout.vivereply.com/`
     — expect **200** (the public landing page, new tagline).
  2. `curl -s -o /dev/null -w "%{http_code}\n" https://suitescout.vivereply.com/og-image.png`
     — expect **200** (the rename worked).
  3. `curl -s -I https://suitescout.vivereply.com/board` — expect
     **307** to `/login?next=/board`. The board must never serve
     unauthenticated.
  4. Log in with `demo` + `APP_PASSWORD`. A wrong password must fail.
  5. Board loads and shows **29 prospects** (0 Hot, 4 Warm, 25
     Cold), 107 drafts ready, 37 follow-ups set — the 20 seeded
     plus 9 added since, all researched, scored, and drafted.
  6. Confirm the nightly backup exists: a dump in
     `~/suitescout/backups/` from `./scripts/pg-backup.sh` (cron
     03:10 Asia/Dhaka).
- **Done when:** `/og-image.png` returns 200,
  `public/screenshots/01-login.png` shows the login form, and the
  board shows the 29 prospects above.

### 2. Push the final docs — ~10 min

- **Action:** Push the five final docs (staged at
  `~/workspace/vultr-hackathon/docs-final/` — README.md,
  SUBMISSION-CHECKLIST.md, README-INCLUDE-REMOVE.md,
  FIXES-FOR-FOUNDER.md, BRAND.md) to `main`. Push now — the
  README's image embeds (`public/og-image.png`,
  `public/screenshots/*.png`) already resolve on github.com. The
  VM rebuild (item 1, Action 3) does not block the push.
- **Done when:** the tip on `main` contains the final docs and
  every image reference in the README resolves on github.com.

### 3. Drop the video link into the deck — DONE

- **Done** (2026-11-08 ~14:56): the YouTube link
  (https://youtu.be/4V5lu60qQC8) is on slide 4 of the pitch deck
  (clickable in the PDF and the PPTX); both files re-exported
  under the same names. One follow-up: after the 01-login swap
  (item 1), re-render the deck so slide 4's login image shows the
  login form instead of the landing page.

### 4. File the LabLab submission (with demo login) — ~30 min

- **Action:** In LabLab, fill in: repo URL
  (`https://github.com/swopno1/suitescout`), demo URL
  (https://suitescout.vivereply.com), demo login (username `demo`,
  password = `APP_PASSWORD` from `~/suitescout/.env` on the VM),
  video link (https://youtu.be/4V5lu60qQC8), screenshots (item 1),
  cover image (the OG image — item 1), pitch deck PDF (item 3),
  and the write-up — use the README's intro + five-step loop +
  scoring rubric as the source. Do not reintroduce struck claims
  (no "verified live" board scores, no Qwen scoring, no "one email
  per draft", no "nothing else sends, ever", no scheduled sending,
  no STOP guarantee). State the limitations honestly — the README's
  "Current limitations" section is the approved wording. The
  password goes in the submission only — never in the README or
  the repo.
- **Status 2026-11-08 ~14:55:** Step 1 content is prepared — title
  "SuiteScout — ViveReply's Resort PMS sales agent" (locked),
  short + long descriptions done; Technologies: select Vultr +
  Qwen3 only; Categories: pick Business, Productivity,
  Assistant / Virtual Assistant, Email (Sales over Assistant if
  present — exact list still to confirm from the open dropdown).
  Step 2 needs: cover image (item 1), video link (done — paste
  the YouTube URL), pitch deck PDF (item 3), screenshots (item 1).
- **Done when:** LabLab shows the submission complete/submitted with
  every field filled, including the demo login and the video link.

### 5. Final live checks — ~15 min

- **Action:** From a clean browser session (no saved login): open
  https://suitescout.vivereply.com, log in with the demo login from
  the submission, open the board, open one prospect detail, open one
  run trace, open settings. Confirm no 500s, no redirect loop, and
  that every screen matches its screenshot from item 1. One
  manual Send of an approved email draft is still unproven as the
  outreach path: Settings shows "1 sent in the last 24h", but
  whether that was the outreach send or the cap-exempt test email
  is unconfirmed — if you want the outreach path proven before
  filing, do one manual Send now (it consumes one of the 10 daily
  sends; a prospect that has already been emailed cannot be emailed
  again, so pick the prospect deliberately).
- **Done when:** all five screens load cleanly from a fresh session
  with the exact demo credentials in the submission. If anything
  fails, fix it and repeat this item — do not submit on a broken
  demo.

## Post-submission — after Mon Nov 9, 05:00 Dhaka

1. **Keep the demo live through judging.** Do not stop the VM, the
   app container, `platform-postgres`, or Caddy until winners are
   announced (Nov 9). No deploys during judging except to fix a
   broken demo.
   - *Done when:* winners are announced and the demo was reachable
     throughout.
2. **Let the nightly backup keep running.** The 03:10 Asia/Dhaka
   `pg-backup.sh` cron stays on.
   - *Done when:* a dump dated after the submission exists in
     `~/suitescout/backups/`.
3. **Answer judge / LabLab follow-ups.** Check LabLab for questions
   or requests while judging runs.
   - *Done when:* no judge question is left unanswered at winners
     announcement.
4. **Decide the VM's future after judging.** Keep, downgrade, or
   terminate the VM once the result is known; record the decision.
   - *Done when:* the decision is recorded and acted on.
5. **Deferred code work only after judging.** `FIXES-FOR-FOUNDER.md`
   parked items (Approve-button warning, Demo-badge label, fact-sheet
   Yes/No, "In talks" label, settings count label, empty-board first
   step, STOP suppression, follow-up mark-done + follow-up email
   exception, `/api/health`, non-root `USER`, scheduled sending,
   Settings daily-cap copy) are not submission blockers — do them
   after judging, not before.
   - *Done when:* each item is applied or explicitly dropped, after
     judging.
6. **Rotate the demo password after judging.** Set a new
   `APP_PASSWORD` on the VM (`docker compose up -d` to reload) —
   the submitted password has been shared with judges.
   - *Done when:* the old password no longer logs in.

## Reference: LabLab item status

| Item | Status | Notes |
|---|---|---|
| Repo public | ✅ | `swopno1/suitescout`, `main`, public. |
| README with architecture explanation | ✅ | Truth-audited README in `main` — accurate architecture (8 tables, app container only in this repo's compose, Postgres + Caddy in the separate platform stack, Resend leg, scout queue), verified API table, full env table, working local + VM setup, honest limitations. Final version staged for push (item 2). |
| Demo video | ✅ | 2:27 walkthrough, edited: https://youtu.be/4V5lu60qQC8 |
| Screenshots | ✅ in repo, 01-login swap pending | Five files committed under `public/screenshots/`; `01-login.png` is a landing duplicate — swap in the full-page login capture (item 1). |
| Landing page at `/` | ✅ | Live, verified 2026-11-08 ~14:55 — `/` returns 200 with the landing content (tagline, judges band, five-step loop). |
| VM backend live | ✅ | Live at https://suitescout.vivereply.com. Board login-wall verified (307 → `/login`). Board shows 29 prospects, 107 drafts, 37 follow-ups. |
| OG image (`public/og-image.png`) | 🟡 rename done, rebuild pending | File in the repo at `public/og-image.png` (87,690 bytes, new tagline); serves at `/og-image.png` after the VM rebuild (item 1). |
| Pitch deck | ✅ video link in | PDF + PPTX with real screenshots + https://youtu.be/4V5lu60qQC8 on slide 4. Re-render after the 01-login swap (item 1). |
| Demo URL in the submission | 🟡 | https://suitescout.vivereply.com — item 4. |
| Demo login in the submission | 🔴 founder-owned | Username `demo`, password = `APP_PASSWORD` — item 4. Never in the README or repo. |
| LICENSE | ✅ MIT | `LICENSE` committed; README License section reads MIT. |

## Known limitations — do not claim as done

(Already stated honestly in the README under "Current
limitations" — do not contradict them in the submission video or
write-up.)

- No scheduled sending; follow-ups never fire on their own.
- One email per prospect — the duplicate guard also blocks
  follow-up emails until it learns a follow-up exception.
- No follow-up mark-done; follow-ups do not link back to their draft.
- No suppression list / bounce-complaint webhook — the STOP footer
  currently has no mechanism behind it.
- No `/api/health` endpoint (compose healthcheck probes `/`).
- No non-root user in the container (mitigated by `cap_drop: ALL`,
  `no-new-privileges`, memory/pids limits).

## Repo hygiene notes for the founder

- **`.gitignore` contains `docs/*`.** Any file under `docs/` can never
  be committed. If extra docs are ever wanted in the repo, they must
  live at the root (like this checklist) or the rule must be
  deliberately changed.
- **`backups/` is gitignored.** Nightly DB dumps stay on the VM and
  can never be committed by accident.
- **Do not commit `.env`.** The demo password lives in the LabLab
  submission only.
- **Do not commit screenshots under `docs/`** (see above) and do not
  commit a video file to the repo.
- **`public/og-image.png` is the metadata path.** The landing page's
  OG/Twitter images point at `/og-image.png`; any image meant as the
  feature image must live at exactly that path in `public/` — a
  differently-named file will 404 (or sit behind the login wall).
- **Use the viewport screenshots for LabLab.** The full-page
  alternates are taller and, for the prospect detail, show prospect
  phone numbers below the fold. The viewport versions show no
  contact details.
