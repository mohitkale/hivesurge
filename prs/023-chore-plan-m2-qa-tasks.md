# PR 023 — chore/plan-m2-qa-tasks (base: main)

**Summary:** Adds M2 tasks from QA's PR 002 playtest (PR 022) to PLAN.md and marks M1 done now that
`v0.1.0-slice` is tagged. Follow-up to PR 003 (merged `b60e960`); rebased onto main, PR 003 commits dropped.

**Changes**

- `PLAN.md`: M1 done (tagged `v0.1.0-slice`); new M2-17/M2-18 (level 1 eased to ~70% casual win), M2-19a (QA
  emulation re-run with `?debug` overlay after M2-15), M2-19b (real-device touch check — needs Mohit's device),
  M2-20–M2-24 (PR 002 non-blocking bugs: revive-ad early close, defeat headline, WebGL warnings, star-row text,
  tablet input lag); M2-15 overlay behind `?debug`; M2-11 verifies star rating; note that QA branch
  `qa/m1-pr002-playtest` (`51f944c`) went through the review gate as PR 022 (merged `9afc896`).
- `prs/INDEX.md`: claim PR 023.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
