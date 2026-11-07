# SuiteScout — founder checklist for submission

Track 02, "Powering the Future of Work". **Deadline: Mon Nov 9, 05:00
Dhaka.** Repo: `swopno1/suitescout`, branch `main`, public. The
rewritten README in this polish folder is written against tip
`19e5248` ("Verdict hygiene: purge stale no-send claims, document auth
verify"). Total pre-submission work below: roughly 3–4 hours.

Work the pre-submission items in order. Each item states its
done-condition — it is done only when that condition is met, not when
the step was attempted.

## Pre-submission — in order

### 1. Record the video — ~60–90 min

- **Action:** Record the walkthrough from the live board at
  https://suitescout.vivereply.com, logged in as `demo`: board →
  one run on a demo-trio prospect (The Cox Beach Resort, Sundori Eco
  Resort, or Balishira Resort) showing research → score → draft →
  follow-up draft → approve/send flow → settings. No video exists in
  the repo yet; do not commit a video file to the repo — upload it
  and link it in the LabLab submission.
- **Done when:** the video plays end-to-end, shows the login → board
  → run → draft sequence on the live site, and its link is pasted in
  the LabLab submission.

### 2. Take the real screenshots — ~20 min

- **Action:** From the live board after logging in, capture five
  screenshots and save them at the repo root under `screenshots/`:
  `01-login.png`, `02-board.png`, `03-prospect-detail.png`,
  `04-run-trace.png`, `05-settings.png`. Upload the same five files
  to the LabLab submission. Do **not** put them under `docs/`
  (`docs/*` is gitignored — files there can never be committed).
- **Done when:** all five files exist under `screenshots/`, each shows
  the screen its name says, and all five are attached in LabLab.

### 3. File the LabLab submission (with demo login) — ~30 min

- **Action:** In LabLab, fill in: repo URL
  (`https://github.com/swopno1/suitescout`), demo URL
  (https://suitescout.vivereply.com), demo login (username `demo`,
  password = `APP_PASSWORD` from `~/suitescout/.env` on the VM),
  video link (item 1), screenshots (item 2), and the write-up — use
  the rewritten README's "What SuiteScout is" + five-step loop +
  scoring rubric as the source. Do not reintroduce the struck claims
  (no "verified live" board scores, no Qwen scoring, no "nothing
  else sends, ever"). The password goes in the submission only —
  never in the README or the repo.
- **Done when:** LabLab shows the submission complete/submitted with
  every field filled, including the demo login and the video link.
  (If the README commit in item 5 changes any wording, update the
  LabLab write-up to match before the deadline.)

### 4. VM deploy-verify — ~30–45 min

- **Action:** On the VM, from `~/suitescout`:
  `git pull` then `docker compose up -d --build`. Then verify, by
  seeing each one work:
  1. `curl -s -o /dev/null -w "%{http_code}\n" https://suitescout.vivereply.com/`
     — expect a redirect to `/login` (302/307) or 200; the board must
     never serve unauthenticated.
  2. Log in with `demo` + `APP_PASSWORD`. A wrong password must fail.
  3. Board loads and shows the 20 seeded prospects (unscored until a
     run — that is correct behaviour, not a bug).
  4. Run the loop once on a demo prospect and check the score against
     the README rubric by hand.
  5. One manual Send of an approved email draft — an outreach send,
     so it consumes one of the 10 daily sends. (The Settings test
     email is cap-exempt and does not prove the outreach path; use it
     only to check Resend deliverability.)
  6. `node scripts/scoring-test.ts` — expect 6/6. Needs Node ≥22.6;
     the app container runs Node 20, so run this on a machine with a
     newer Node, not inside the app container.
  7. Confirm the nightly backup exists: a dump in
     `~/suitescout/backups/` from `./scripts/pg-backup.sh` (cron
     03:10 Asia/Dhaka).
- **Done when:** every numbered check above has been seen passing on
  the live VM, including the login, the board, one full run, and one
  manual send.

### 5. Commit the README / docs — ~15 min

- **Action:** Push the rewritten `README.md` from
  `~/workspace/vultr-hackathon/submission-polish/` to repo root on
  `main` (parent agent pushes; tap the approval card if one appears).
  Optionally also commit this checklist at the repo root as
  `SUBMISSION-CHECKLIST.md` and the screenshots from item 2. Do not
  commit anything under `docs/` and do not commit `.env`.
- **Done when:** GitHub `main` shows the new README (spot-check the
  scoring table, the API table, and the "Current limitations"
  section), and no stale claim from the old README remains.

### 6. LICENSE — decided: MIT — ~10 min + commit

- **Action:** LabLab's Terms of Use §16 require submissions to be
  "open source, and compliant with the MIT License" — so the repo
  carries the MIT License: `LICENSE` at the repo root (Copyright (c)
  2026 Md Amir Hossain), `"license": "MIT"` and `"author": "Md Amir
  Hossain"` in `package.json`, and the README License section reads
  `MIT — see [LICENSE](LICENSE).` (pushed together with the README
  in item 5). Do not reintroduce "All rights reserved" anywhere.
- **Done when:** the `LICENSE` file is committed, GitHub shows the
  MIT license badge, and the README License section states MIT —
  no placeholder remains.

### 7. Code fixes + comment additions — ~30 min

- **Action:** Apply `FIXES-FOR-FOUNDER.md` items 1–6 in one pass:
  (1) `lib/agent.ts:410` false "nothing sends itself" run-trace line;
  (2) `lib/email.ts` test-email `resend_id: null` recording fix;
  (3) `lib/db.ts:906` drafts count (draft status only, or rename the
  stat); (4) `lib/db.ts:31` "five tables" comment → eight; (5)
  Dockerfile "All 4 runtime variables" comment; (6) the seven dead
  `docs/BUILD-SPEC.md` comment citations → re-point at
  `lib/scoring.ts` / `scripts/scoring-test.ts`. Rebuild and redeploy
  on the VM afterwards (`docker compose up -d --build`).
- **Done when:** all six fixes are in `main`, the VM runs the rebuilt
  image, the board loads, and one run completes on a demo prospect.

### 8. Final live checks — ~15 min

- **Action:** From a clean browser session (no saved login): open
  https://suitescout.vivereply.com, log in with the demo login from
  the submission, open the board, open one prospect detail, open one
  run trace, open settings. Confirm no 500s, no redirect loop, and
  that every screen matches its screenshot from item 2.
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
   items 7–18 (Approve-button warning/feedback, Demo-badge label,
   login-page copy, fact-sheet Yes/No, "In talks" label, settings
   count label, empty-board first step, STOP suppression, follow-up
   mark-done, `/api/health`, non-root `USER`, scheduled sending)
   are not submission blockers — do them after judging, not before.
   - *Done when:* each item is applied or explicitly dropped, after
     judging.

## Reference: LabLab item status

| Item | Status | Notes |
|---|---|---|
| Repo public | ✅ | `swopno1/suitescout`, `main`, public. |
| README with architecture explanation | ✅ | Rewritten README in this folder — accurate architecture (8 tables, app container only in this repo's compose, Postgres + Caddy in the separate platform stack, Resend leg, scout queue), verified API table, full env table, working local + VM setup. |
| VM backend live | 🟡 | Live at https://suitescout.vivereply.com. **Post-login verification was NOT done by the docs writer** (no login available to this agent) — the founder verifies it in item 4 above. |
| Demo URL in the submission | 🟡 | https://suitescout.vivereply.com — item 3. |
| Demo login in the submission | 🔴 founder-owned | Username `demo`, password = `APP_PASSWORD` — item 3. Never in the README or repo. |
| Recorded video | 🔴 founder-owned, MISSING | Item 1. |
| Screenshots | 🔴 founder-owned, MISSING | Item 2. |
| LICENSE | ✅ MIT | Item 6. `LICENSE` committed; README License section reads MIT. |

## Known limitations — do not claim as done

(Already stated honestly in the rewritten README under "Current
limitations" — do not contradict them in the submission video or
write-up.)

- No scheduled sending; follow-ups never fire on their own.
- No follow-up mark-done; follow-ups do not link back to their draft.
- No suppression list / bounce-complaint webhook — the STOP footer
  currently has no mechanism behind it.
- No `/api/health` endpoint (compose healthcheck probes `/`).
- No non-root user in the container (mitigated by `cap_drop: ALL`,
  `no-new-privileges`, memory/pids limits).
- Test-email success path records `resend_id` null (one-line fix,
  `FIXES-FOR-FOUNDER.md` item 2).

## Repo hygiene notes for the founder

- **`.gitignore` contains `docs/*`.** Any file under `docs/` can never
  be committed — including a `docs/BUILD-SPEC.md` the old README cited
  (it does not exist in the repo). The rewritten README cites
  `scripts/scoring-test.ts` and `lib/scoring.ts` instead. If extra
  docs are ever wanted in the repo, they must live at the root
  (e.g. `SUBMISSION-CHECKLIST.md` at the repo root) or the `.gitignore`
  rule must be deliberately changed.
- **Do not commit `.env`.** The demo password lives in the LabLab
  submission only.
- **Do not commit screenshots under `docs/`** (see above) and do not
  commit a video file to the repo.
