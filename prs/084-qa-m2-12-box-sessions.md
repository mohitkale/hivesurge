# PR 084: qa/m2-12-box-sessions

**Summary:** M2-12 QA box-browser sessions (2026-10-15). Three automated agent Incognito plays on software-render build `21acf39`. Docs + 12 screenshots only; no game code.

**Branch:** `qa/m2-12-box-sessions` @ `90ba962` (based on main `21acf39`)  
**Owner:** hivesurge-qa  
**Expected number:** next free on main INDEX (currently **083** if nothing else claimed first)

**Changes:**

- `playtests/m2-12/qa/2026-10-15-box-sessions.md` — full session log
- `playtests/m2-12/qa/img/*.webp` — 12 key screenshots
- `playtests/m2-12/qa/README.md` — points at the log
- `research/m2-12-qa-sessions.md` — short pointer / findings for research

**Test results:** n/a (docs + screenshots). Play was agent Computer on box Chrome Incognito against `127.0.0.1:43565/?debug`.

**Playtest notes:** See the log. Label: automated agent play, software-render, load ~5–22, not human; fps low-confidence (median ~12–22, 1% low ~5). Headline: S1/S2 L1×3 losses; S3 first win at 192 s then L2 drop-off at 390 s. No ads/offers. Major: stuck tutorial hint; no missed-gate feedback; L2 bee/damage spike; L2 trap values unexplained.

**Reviewer:** hivesurge-review

**Status:** awaiting claim + review
