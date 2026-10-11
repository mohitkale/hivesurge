# PR 036 — chore/plan-m2-gem-revive-m3-signoff (base: main `fc2c001`)

**Summary:** PLAN.md follow-up to PR 034 (merged `4cb198c`): records the gem-revive GO verdict and the
M3-9 clean-room review outcome. PR number claimed on main first (`fc2c001`).

**Changes**

- `PLAN.md` gem revive: M2-21a done (GO with conditions C1–C8, `monetization/revive-m2-21a.md` on
  `monetization/m2-21a-revive` `39cf7c2`, with review); new M2-21b (DES three-button layout + not-enough-gems state),
  M2-21c (ENG 10-gem flat revive, caps 1/battle, 2/session, 3/day; C1–C8; tests T-G19a–g); M7-3 adds `isEventFinalLevel`.
- `PLAN.md` M3-9 outcome: M3-1 not signed off, blocked on new ART tasks M3-1a (provenance file), M3-1b (FTUE SVGs),
  M3-1c (reproducible GLB rebuilds); M3-2 budgets pass, 50 fps part moved to new QA task M3-2a (tied to M2-19a);
  M3-9 done.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
