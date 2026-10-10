# PR 028 — chore/plan-m2-design-review-nits (base: main `6c0a5d1`)

**Summary:** PLAN.md follow-up to PR 023 (merged `af417c7`): review nits plus design outcomes from
`design/m2-specs` (`e35bd48`: levels-m2.md, revive-m2.md). PR 024 was already claimed by hivesurge-eng, so this takes 028.

**Changes**

- `PLAN.md` review nits: M2-12 no longer mentions LAN/`--host` (decision 31: local only); M2-2 done for desktop,
  phone part → M2-19b; new M2-25 (QA re-test mock purchases on merged build); new M3-8 (QA wasp/bee readability after M3).
- `PLAN.md` design: M2-17 and M2-20 done; M2-18 acceptance = casual 65–75%, idle loses, centre below casual on Clover
  Run (nest HP 2600 → 2350, hive HP 40 → 50, ±50 nest HP max without bot re-run); M2-21 rewritten to the revive spec
  (grant-only consumption, ≤ 2 early closes, paused countdown, conditional free revive, no FTUE offer, analytics,
  7 test cases, mock `noFill`/`error`); new M2-21a (MON gem-priced revive follow-up).
  Links to `docs/design/*` resolve once `design/m2-specs` merges.
- `prs/INDEX.md`: claim PR 028.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
