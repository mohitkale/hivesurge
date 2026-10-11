# PR 056 — chore/plan-m4-ledger-m2-12-findings (base: main `e7abf40`)

**Summary:** Adds the gem-ledger task that gates cloud save and records the provisional M2-12 findings with follow-up
tasks. Number claimed on main first (`e7abf40`).

**Changes**

- New M4-5a (ENG, blocks M4-5 shipping): append-only gem spend/grant ledger; merge by ledger, never losing gems
  bought/earned on another device and never refunding a spend; PR 048's lower-balance merge in `src/platform/save.ts`
  must not ship with cloud save; cross-device buy/spend/merge, offline-grant and duplicate-entry tests.
- M2-12: provisional report in PR 052 (the request said PR 051; INDEX shows research renumbered to 052, 051 is an eng fix) (`research/m2-12-local-playtest-report.md`): L5 aim-bot only, sweep beats
  L1–L4, L4 cliff, 94.5% drop-off at L4/L5, FTUE doesn't teach aiming. Re-check after PR 044; QA sessions pending;
  fps re-check on real GPU. M2-26 noted as addressing the L4/L5 cliff.
- New M2-28 (DES + ENG): aiming-pillar fix — sweep bot ≥ 15 points below aim bot on L1–L4, casual in range.
- New M2-29 (DES + ENG): FTUE aiming step.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
