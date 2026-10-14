# PR 082 — chore/plan-m2-28-29-done (base: main `21acf39`)

_PR number pending: claimed via hivesurge-review (decision 37); rename this doc once assigned._

**Summary:** PLAN.md status update: M2-28/M2-29 and M2-28c done, M2-28d added in progress, M2-28b on hold, M2-25 done after QA starter-skin re-check, and PR 071 low-end fps QA pass under M2-19a. M2-12 stays PROVISIONAL. No M4 work.

**Changes**

- M2-28 / M2-29: **done** (eng PR 076 `c64412b`). Aim − sweep is at least 45.5 points on L2–L5; narrow ±2 wiggle wins remain a known gap tracked by M2-28b.
- M2-28c: **done** (design PR 074 `3c5599f`).
- M2-28d (new, ENG): **IN PROGRESS** on `feat/m2-28d-aim-trace`, PR number pending claim. Aim-trace logger behind `?debug`, off by default with zero cost when off; timestamped aim x + launch events per battle; JSON export; format in `docs/design`; lint + vitest.
- M2-28b: **ON HOLD** — QA box sessions are automation-driven, so scripted traces aren't real-player data. Blocked on M2-28d plus real traces from Mohit's M2-19b device session or outside testers (PT-A, needs Mohit's approval).
- M2-25: **done** — starter skin re-check PASS by QA on main `21acf39`. Minor follow-ups for art/design: back star hard to resolve at battle scale; shop list doesn't show pack contents.
- M2-19a: PR 071 low-end fps check PASS by QA in software render: auto 44/35.5, low 60/59, high pinned 26/17.
- M2-12: left PROVISIONAL (unchanged).

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting PR number + review
