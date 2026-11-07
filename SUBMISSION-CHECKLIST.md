# SuiteScout — founder checklist for submission

Track 02, "Powering the Future of Work". **Deadline: Mon Nov 9, 05:00
Dhaka (Sun Nov 8, 23:00 UTC)** — submit with buffer, aim Sun 18:00
UTC. Repo: `swopno1/suitescout`, branch `main`, public.

Status: the submission polish is **already in `main`**
(`1901738` README rewrite + MIT LICENSE + these docs, `c17ede9`
code fixes, plus the re-inspection pass committed with this
checklist). Everything under "Already done" below is verified on the
repo — the founder work left is video, screenshots, LabLab filing,
and the VM deploy-verify. Total founder work below: roughly 3–4
hours.

## Already done (verified in `main` — do not redo)

- [x] **README rewritten and truth-audited.** Every claim checked
  against the code: 8 tables, app-only compose, full env table (9
  vars), 19 verified API routes, working local + VM setup, honest
  "Current limitations". Re-verified at `c17ede9` + re-inspection.
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

## Founder work — in order

Work the items in order. Each item states its done-condition — it is
done only when that condition is met, not when the step was attempted.

### 1. VM deploy-verify — ~30–45 min — DO FIRST

Deploy the tip **before** recording, so the video shows the final
build (including the new login copy).

- **Action:** On the VM, from `~/suitescout`:
  `git pull --ff-only` then `docker compose up -d --build`. Then
  verify, by seeing each one work:
  1. `curl -s -o /dev/null -w "%{http_code}\n" https://suitescout.vivereply.com/`
     — expect a redirect to `/login` (302/307) or 200; the board must
     never serve unauthenticated.
  2. Log in with `demo` + `APP_PASSWORD`. A wrong password must fail.
  3. Board loads and shows the 20 seeded prospects (unscored until a
     run — that is correct behaviour, not a bug).
  4. Run the loop once on a demo prospect and check the score against
     the README rubric by hand.
  5. Run one area scout from a working query (e.g. `Saint Martin`,
     verified: 8 leads) and watch it land on `/scout`. (Do not demo
     `Cox's Bazar` — Nominatim returns only the district and the
     scout refuses it as too broad. `Sreemangal` and `Mongla town`
     also work; `Srimongol` is a typo for `Sreemangal`.)
  6. One manual Send of an approved email draft — an outreach send,
     so it consumes one of the 10 daily sends. (The Settings test
     email is cap-exempt and does not prove the outreach path; use it
     only to check Resend deliverability.)
  7. `node scripts/scoring-test.ts` — expect 6/6. Needs Node ≥22.6;
     the app container runs Node 20, so run this on a machine with a
     newer Node, not inside the app container.
  8. Confirm the nightly backup exists: a dump in
     `~/suitescout/backups/` from `./scripts/pg-backup.sh` (cron
     03:10 Asia/Dhaka).
- **Done when:** every numbered check above has been seen passing on
  the live VM, including the login, the board, one full run, one
  scout, and one manual send.

### 2. Record the video — ~60–90 min

- **Action:** Record the walkthrough from the live board at
  https://suitescout.vivereply.com, logged in as `demo`: login →
  board → one run on a demo-trio prospect (The Cox Beach Resort,
  Sundori Eco Resort, or Balishira Resort) showing research → score
  → draft → follow-up draft → approve/send flow → scout → settings.
  Mask any real contact details on screen. No video exists in the
  repo; do not commit a video file to the repo — upload it and link
  it in the LabLab submission.
- **Done when:** the video plays end-to-end, shows the login → board
  → run → draft sequence on the live site, and its link is pasted in
  the LabLab submission.

### 3. Take the real screenshots — ~20 min

- **Action:** From the live board after logging in, capture five
  screenshots and save them at the repo root under `screenshots/`:
  `01-login.png`, `02-board.png`, `03-prospect-detail.png`,
  `04-run-trace.png`, `05-settings.png`. Upload the same five files
  to the LabLab submission. Do **not** put them under `docs/`
  (`docs/*` is gitignored — files there can never be committed).
  Commit the `screenshots/` folder to `main` when done.
- **Done when:** all five files exist under `screenshots/`, each shows
  the screen its name says, all five are attached in LabLab, and the
  folder is committed.

### 4. File the LabLab submission (with demo login) — ~30 min

- **Action:** In LabLab, fill in: repo URL
  (`https://github.com/swopno1/suitescout`), demo URL
  (https://suitescout.vivereply.com), demo login (username `demo`,
  password = `APP_PASSWORD` from `~/suitescout/.env` on the VM),
  video link (item 2), screenshots (item 3), and the write-up — use
  the README's intro + five-step loop + scoring rubric as the source.
  Do not reintroduce struck claims (no "verified live" board scores,
  no Qwen scoring, no "one email per draft", no "nothing else sends,
  ever"). State the limitations honestly — the README's "Current
  limitations" section is the approved wording. The password goes in
  the submission only — never in the README or the repo.
- **Done when:** LabLab shows the submission complete/submitted with
  every field filled, including the demo login and the video link.

### 5. Final live checks — ~15 min

- **Action:** From a clean browser session (no saved login): open
  https://suitescout.vivereply.com, log in with the demo login from
  the submission, open the board, open one prospect detail, open one
  run trace, open settings. Confirm no 500s, no redirect loop, and
  that every screen matches its screenshot from item 3.
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
   exception, `/api/health`, non-root `USER`, scheduled sending)
   are not submission blockers — do them after judging, not before.
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
| README with architecture explanation | ✅ | Truth-audited README in `main` — accurate architecture (8 tables, app container only in this repo's compose, Postgres + Caddy in the separate platform stack, Resend leg, scout queue), verified API table, full env table, working local + VM setup, honest limitations. |
| VM backend live | 🟡 | Live at https://suitescout.vivereply.com. Founder verifies post-login in item 1 above. |
| Demo URL in the submission | 🟡 | https://suitescout.vivereply.com — item 4. |
| Demo login in the submission | 🔴 founder-owned | Username `demo`, password = `APP_PASSWORD` — item 4. Never in the README or repo. |
| Recorded video | 🔴 founder-owned, MISSING | Item 2. |
| Screenshots | 🔴 founder-owned, MISSING | Item 3. |
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
