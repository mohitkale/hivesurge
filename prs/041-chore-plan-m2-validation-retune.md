# PR 041 — chore/plan-m2-validation-retune (base: main `a2b9846`)

**Summary:** PLAN.md follow-up after PR 036 (merged `574a682`): records design validation from PR 035, adds the
retune and FTUE polish tasks, and aligns the gem-revive tasks with PR 039. Number claimed on main first (`a2b9846`).

**Changes**

- M2-4 validated (PR 035): casual bot win rate by stage 100 / 98.5 / 74 / 16 / 0; stage 2 target ≥ 90%.
- M2-6 validated (PR 035): first queen launch 5–15 s, prompts ≤ 5 words.
- New M2-26 (ENG): retune thistle-gauntlet and wasp-queen-nest; done when a bot re-run puts every M2 stage in range.
- New M2-27 (ENG): FTUE polish — prompt hold ≥ 1.5 s, step 3 timeout halves moving gate speed.
- M2-21b: in PR 039 (with review, changes requested). Early-close rule per PR 039: gems valid = affordable, within
  caps and not hidden; after 2 early closes the offer stays open (ad disabled, gems + No thanks) while gems are valid
  and closes on can't afford / caps reached / event final level.
- M2-21c (ENG): scope includes `ReviveOffer.takeGems()` and changing PR 030's revive code to that rule; depends on
  PR 039 being merged.

**Review fixes (REVIEW-041):** close reasons follow PR 039 (no "first 3 battles", no "etc."); unsourced
"MON confirmed" claim removed (no committed MON doc confirms PR 039); M2-21c depends on PR 039 merged; this doc
now matches PLAN.md.

**Commits:** `1a45d42`, `ca6653f`, `a3e3d20`, plus this fix commit.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
