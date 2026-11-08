# SuiteScout — submission record + judging-period checklist

Track 02, "Powering the Future of Work". **SUBMITTED 2026-11-08**
(tip `9ab13da`). Deadline was Mon Nov 9, 05:00 Dhaka (Sun Nov 8,
23:00 UTC). Repo: `swopno1/suitescout`, branch `main`, public.

This file was the pre-submission checklist; it is now the submission
record. Everything under "Submitted" is done and verified. What is
left is judging-period care (below) plus two known follow-ups from
the post-submission inspection.

## Submitted (verified — do not redo)

- [x] **README rewritten and truth-audited** — 8 tables, app-only
  compose, full env table (9 vars), 19 verified API routes, working
  local + VM setup, honest "Current limitations", demo video link,
  real screenshot embeds, OG image. Re-verified at `3dcb1e3` and
  again post-submission (landing-audit batch, see below).
- [x] **LICENSE: MIT** — `LICENSE` at root (Copyright (c) 2026 Md
  Amir Hossain), `package.json` license + author, README License
  section. Do not reintroduce "All rights reserved" anywhere.
- [x] **Public landing page at `/`, board at `/board`** — brand,
  locked tagline "Resort PMS sales-ops", judges band, five-step
  loop, rubric, guardrails, Vultr stack, 7 explore links (all
  verified live post-submission), no demo password. Verified live:
  `/` 200 public, `/board` logged-out 307, login → `/board`.
- [x] **Demo video** — 2:27 walkthrough, edited:
  https://youtu.be/4V5lu60qQC8 (landing → login → board at 29
  prospects → Balishira 55 Warm → drafts → Approve on camera,
  Approve-only, no send filmed → Sreemangal Run #37 trace →
  Settings). Linked in the README and the LabLab filing.
- [x] **Screenshots in the repo** — five viewport captures
  (2880×1740) under `public/screenshots/` (+ `00-home.png`, the
  landing page, intentionally unreferenced by the README),
  embedded in the README with honest captions. Post-submission:
  `05-settigns.png` typo renamed to `05-settings.png`.
- [x] **OG image** — `public/og-image.png` (1200×630, 87,690 bytes,
  new tagline); LabLab cover + YouTube thumbnail + landing metadata.
  Serves live at `/og-image.png` (verified 200 post-submission).
- [x] **LabLab filing** — repo URL, demo URL
  (https://suitescout.vivereply.com), demo login (`demo` + password
  from the submission only), video link, screenshots, cover image,
  pitch deck, write-up. No struck claims (no "verified live" board
  scores, no Qwen scoring, no "one email per draft", no "nothing
  else sends, ever", no scheduled sending, no STOP guarantee).
- [x] **VM deploy-verify** — tip deployed, landing 200, OG 200,
  board login-walled, 29 prospects (0 Hot, 4 Warm, 25 Cold), 107
  drafts, 37 follow-ups, nightly backup cron on.
- [x] **Battery green at submission:** `tsc` clean, `pnpm build`
  green, scoring 6/6, ui-proof 35/35 pure.

## Post-submission inspection batch (committed with this checklist)

Found after filing; all in `main`, one VM rebuild takes the copy
live (founder decides — see judging rule 1):

- Landing rubric row "Modern PMS already in place" → "Booking
  engine already in place" (the −30 fires on `has_booking_engine`;
  the old label reintroduced a struck claim).
- Landing guardrail "the agent never sends on its own" → states the
  owner-only test-email exception (third purge of the "never sends"
  wording; auto-send fires at approval).
- Landing follow-up card "it never sends itself" → "no scheduled
  sending — the follow-up waits for a human".
- Landing scout destinations → verified-only examples (Saint
  Martin's Island, Sreemangal). `Cox's Bazar` was listed but the
  scout refuses it (Nominatim returns only the district) — a judge
  could falsify it in 30 seconds.
- Landing "Nightly database backups, with a verified test restore"
  → "Nightly database backups" (no restore test is on record; if
  the founder has done one, say so and re-add it).
- Landing "10-sends-per-day cap" → "daily send cap (Settings shows
  the live value)" — the VM runs `DAILY_SEND_CAP=20` and Settings
  renders the live value, so pinning 10 contradicted the live
  Settings screen and its screenshot.
- `05-settigns.png` → `05-settings.png` (+ README reference).
- README + BRAND.md OG paragraphs: "until the rebuild, 404s" →
  serves live (verified 200).
- FIXES #24 closed as a false alarm with corrected analysis (the
  Settings string always rendered the live cap; the stale party was
  the landing's hardcoded 10).

## Known follow-ups (founder-owned)

1. **`01-login.png` is still the landing page, not the login form**
   (verified by opening the file post-submission — the planned swap
   never happened). The README caption describes the login form.
   Fix: capture `/login` and replace
   `public/screenshots/01-login.png`; re-render pitch-deck slide 4
   after the swap. Until then the README's first screenshot
   mismatches its caption.
2. **One VM rebuild** (`git pull --ff-only`, `docker compose up -d
   --build`) takes the inspection batch live. During judging this
   is allowed only as a demo fix — the landing-copy corrections
   qualify as accuracy fixes, but the call is the founder's. No
   other deploys during judging.

## Judging-period duties (until winners announced, Nov 9)

1. **Keep the demo live.** Do not stop the VM, the app container,
   `platform-postgres`, or Caddy until winners are announced. No
   deploys except the inspection-batch rebuild above (founder's
   call) or a broken-demo fix.
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
   are not judging blockers — do them after judging, not before.
   - *Done when:* each item is applied or explicitly dropped, after
     judging.
6. **Rotate the demo password after judging.** Set a new
   `APP_PASSWORD` on the VM (`docker compose up -d` to reload) —
   the submitted password has been shared with judges.
   - *Done when:* the old password no longer logs in.

## Reference: LabLab item status (as filed)

| Item | Status | Notes |
|---|---|---|
| Repo public | ✅ | `swopno1/suitescout`, `main`, public. |
| README with architecture explanation | ✅ | Truth-audited README — architecture, verified API table, full env table, working setup, honest limitations, video link, real screenshots. |
| Demo video | ✅ | 2:27 walkthrough: https://youtu.be/4V5lu60qQC8 |
| Screenshots | ✅ filed (01-login shows landing) | Five files under `public/screenshots/`; `01-login.png` is a landing duplicate — see follow-up 1. Typo file renamed post-filing. |
| Landing page at `/` | ✅ | Live — `/` 200 public (tagline, judges band, five-step loop). |
| VM backend live | ✅ | https://suitescout.vivereply.com. Board login-walled (307 → `/login`). 29 prospects, 107 drafts, 37 follow-ups. |
| OG image | ✅ serves live | `public/og-image.png` (87,690 bytes); `/og-image.png` verified 200. |
| Pitch deck | ✅ filed | PDF + PPTX with real screenshots + video link on slide 4. |
| Demo URL + login in submission | ✅ | Demo URL + `demo` login with password. Never in the repo. |
| LICENSE | ✅ MIT | `LICENSE` committed; README License section reads MIT. |

## Known limitations — do not claim as done

(Stated honestly in the README under "Current limitations" — do not
contradict them in any judge follow-up.)

- No scheduled sending; follow-ups never fire on their own.
- One email per prospect — the duplicate guard also blocks
  follow-up emails until it learns a follow-up exception.
- No follow-up mark-done; follow-ups do not link back to their draft.
- No suppression list / bounce-complaint webhook — the STOP footer
  currently has no mechanism behind it.
- No `/api/health` endpoint (compose healthcheck probes `/`, which
  serves the public landing page).
- No non-root user in the container (mitigated by `cap_drop: ALL`,
  `no-new-privileges`, memory/pids limits).
- Live send cap is 20/day on the VM (`DAILY_SEND_CAP=20`); 10 is the
  code default. Never quote either number without saying which.

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
- **Viewport screenshots for LabLab.** The full-page alternates are
  taller and, for the prospect detail, show prospect phone numbers
  below the fold. The viewport versions show no contact details.
- **Screenshot filenames are referenced.** The README embeds
  `public/screenshots/*.png` by exact name — renaming a file
  requires updating the README in the same commit.
