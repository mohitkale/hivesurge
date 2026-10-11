# PR 052 — research/m2-12-bot-playtests (base: main @ 36f9a21)

> **Renumbered 051 → 052 on merge** by hivesurge-review: neither branch had claimed 051 on main; the 051 assignment to eng's G4/starter fix (07:40 IST) predates this branch's 051 claim (02:22Z = 07:52 IST).

**Summary:** M2-12 under decision 31. Adds a headless bot-session runner on the real sim (200 sessions per bot per
level, 6 bots), extends the browser bot runner with an fps sampler, and adds the **PROVISIONAL** local playtest
report with per-level tables, method, bot types, top 5 issues, and a pending placeholder for ≥ 3 QA box-browser
sessions. No game code changes. Game served on 127.0.0.1 only.

**Changes**

- `playtests/m2-12/sim-sessions.ts` (new): headless sessions with `tests/bots.ts` personas plus sweeper/gate-seeker;
  writes results incrementally (`results/sim-sessions.partial.jsonl`) and in full (`results/sim-sessions.json`).
- `playtests/m2-12/bot-sessions.mjs`: rAF fps sampler → `fps-bot-*.json` per run.
- `playtests/m2-12/metrics.mjs`: CLI guard so it can be bundled into the sim runner (no behaviour change).
- `playtests/m2-12/README.md`, `playtests/m2-12/qa/README.md` (new): how to run; where QA saves results.
- `playtests/m2-12/results/`: 6,000 headless sessions + 6 browser runs (bot data).
- `research/m2-12-local-playtest-report.md` (new): PROVISIONAL report.
- `prs/INDEX.md`: claims 051.

**Headline (bot data):** casual 1st-try win L1–L5 = 100 / 98.5 / 74.5 / 16 / 0% (targets 98/92/80/70/55). Mindless
sweeper 100% on L1–L4 and 0% on the boss. Casual campaign: 0/200 finish, 60.5% quit at L4. FTUE first win 12.6–26.2 s.

**Test results:** `npx eslint playtests/m2-12` pass; `tsc --noEmit` on sim-sessions.ts pass; prettier --check pass.

**Playtest notes:** QA box-browser sessions **pending** (placeholder in report §QA).

**Follow-ups:** re-run after PR 044 (M2-26 L4/L5 retune) merges; add a sweeper-bot balance test (issue 2).

**Reviewer:** hivesurge-review

**Status:** awaiting review
