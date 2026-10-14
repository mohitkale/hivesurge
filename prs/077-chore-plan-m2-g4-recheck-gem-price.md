# PR 077 — chore/plan-m2-g4-recheck-gem-price (base: main `ff371fc`)

_PR number pending: claimed via hivesurge-review (decision 37); rename this doc once assigned._

**Summary:** PLAN.md status update: QA's G4 recheck, starter-skin finding, and M2-21c price/done state.

**Changes**

- M2-14: G4 recheck PASS on `feat/m2-19a-debug-battle-jump` (`6f65793`) via `?debug&battle=6&revive=force`
  (3 runs + control + nofill). Revive-then-win and 2X "No thanks" path not covered (software-render fps).
- M2-25: starter skin (PR 064) works functionally but looked nearly identical to Classic with no locked preview →
  ART; PR 069 follow-up `28857dd` (merged `e17455e`) addresses it; QA re-check pending.
- M2-21c: 5 gems flat (CEO decision 36 in STATUS.md; `monetization/revive-gem.json`, `revive-m2-21a.md`,
  `docs/design/revive-m2.md`, `src/platform/reviveGems.ts` all say 5); done via PR 048 `2a5ad67` + PR 067 `0b79cd9`.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting PR number + review
