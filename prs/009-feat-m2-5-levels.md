# PR 009 — feat/m2-5-levels (M2-5; base: feat/m2-9-code-split, PR 006, which is on PR 005)

**Summary:** Adds the M2-4 campaign from `docs/design/levels-m2.md` as JSON: L1 `ftue-meadow`, L2 `dandelion-drift`,
L3 `clover-run` (unchanged), L4 `thistle-gauntlet` and L5 boss `wasp-queen-nest`. Also adds idle, centre and aim bot
balance tests per level, plus campaign progression in the game.

Stacked on PR 006 rather than directly on PR 005: progression needs `src/game.ts`, and basing on PR 005 would
guarantee a `main.ts`/`game.ts` conflict.

**Changes**

- `src/levels/*.json`: 4 new levels, values copied from the spec.
  - L5 uses PR 005's `bossPhases`: phases at 100/66.67/33.33% nest HP, with the spec's bursts and cadences.
  - The −30 trap gate appears only from phase 2 (`fromPhase`). Phase 3 speeds up moving gates ×1.4 and spawns the
    Matriarch.
- `src/levels/index.ts`: ordered 5-level campaign. `src/levels/progress.ts`: `nextLevelIndex`, the first level
  without a star.
- `src/sim/triggers.ts`: `autoTriggers` fires "step3" at 6 s and "step5" on the first queen launch. This drives
  `ftue-meadow`'s trigger waves until M2-7's FTUE drives them.
- `src/game.ts`: plays the current campaign level. The title shows "Level n/5 · name"; analytics and stars use the
  level id.
- `tests/bots.ts`: `idleBot`, `centreBot` and `aimBot`.
  - `aimBot` tries every non-trap gate and every ordered pair (alternating every 3 s), always aiming with lead
    `gateX(t + travelTime)`. It does this on the level's base seed, keeps the best plan, and plays it. It stands in for
    a player who has learned the level.
  - `winRate` runs over seed variants.
- `tests/levelsBalance.test.ts`: per level, idle loses; aim wins within unit caps; aim win rate ≥ 0.75 over 8 seeds
  and above centre (not checked for FTUE). Also campaign order and progression (17 tests).

**Bot results** (20 seeds each; measured while writing this PR; time left is for the base seed):

| Level               | DES target 1st-try | Idle | Centre win rate | Aim win rate | Aim time left |
| ------------------- | ------------------ | ---- | --------------- | ------------ | ------------- |
| L1 ftue-meadow      | 98%                | lost | 1.00            | 1.00         | 62.2 s        |
| L2 dandelion-drift  | 92%                | lost | 0.25            | 1.00         | 47.8 s        |
| L3 clover-run       | 80%                | lost | 0.00            | 0.80         | 56.4 s        |
| L4 thistle-gauntlet | 70%                | lost | 0.00            | 1.00         | 58.4 s        |
| L5 wasp-queen-nest  | 55%                | lost | 0.00            | 1.00         | 6.5 s         |

**Reading the numbers:**

- Bot win rates are not the first-try rates for a human. DES targets need real playtests (M2-12) and analytics.
- L2–L4: the aim bot wins with 47–58 s left, well outside the generator validator's "10–40 s left" band. These levels
  are likely easier than intended for a skilled player.
- L5 boss: the aim bot wins with only 6.5 s left, so it is tight.
- I did not change any spec values. I recommend DES retune L2–L4 (e.g. raise `nestHp`).
- The "greedy ×3 only" plan on L4 loses, which is the intended risk-vs-safety lesson.

**Test results:** `npm run lint` pass · `npm test` 82/82 (11 files, about 11 s) · `npm run build` pass. Entry 4.76 kB
(2.14 kB gzip), game 47.50 kB (16.30 kB gzip), three 537.84 kB (134.09 kB gzip). Headless Chrome on `vite preview`
shows the title "Level 1/5 · Meadow Start".

**Acceptance (PLAN M2-5):**

- New levels playable, idle loses / aim wins on each: met. That is 4 new levels (L1, L2, L4, L5) plus L3, which is
  what the M2-5 description lists. The criterion's "5 new" counts the whole campaign.
- Idle, centre and aim bots per level: met.
- Win rates reported vs DES targets: met, in the table above.

**Playtest notes:** Not hand-played. Before the M2-7 FTUE, L1 runs with `autoTriggers` (no prompts, hive damage
enabled). Existing saves with Clover Run stars now start at L1.

**Reviewer:** hivesurge-review

**Status:** awaiting review + playtest
