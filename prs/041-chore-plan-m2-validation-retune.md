# PR 041 — chore/plan-m2-validation-retune (base: main `a2b9846`)

**Summary:** PLAN.md follow-up after PR 036 (merged `574a682`): records design validation from PR 035 and
adds the retune and FTUE polish tasks. Number claimed on main first (`a2b9846`).

**Changes**

- `PLAN.md`: M2-4 validated (casual 100 / 98.5 / 74 / 16 / 0 by stage; stage 2 target ≥ 90%); M2-6 validated
  (queen launch 5–15 s, prompts ≤ 5 words); new M2-26 (ENG retune thistle-gauntlet + wasp-queen-nest) and M2-27
  (ENG FTUE polish: prompt hold ≥ 1.5 s, step 3 timeout halves moving gate speed); M2-21b → PR 039 pending MON
  confirmation (review has requested changes); M2-21c may start from `cc600b4`.
- `prs/INDEX.md` claim committed on main separately.

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
