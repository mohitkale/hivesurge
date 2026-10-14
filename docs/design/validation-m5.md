# M5-1 meta validation (PROVISIONAL)

> **PROVISIONAL. Every number here is bot or sim data, not player data.** Sources are the M2-12 headless bots (PR 052, re-run in research PR 062) and MON's M5-2a economy sim (`monetization/sim/last_run.md`, `economy_sim.py`), plus scratch re-runs on main `21acf39`. Nothing here comes from players. Re-validate after the QA box sessions and again if PT-A (outside playtests) is approved. Sandbox only.

Scope: `docs/design/meta-m5.md` (chests, collectible bees, loadout slots, hive rooms, expectedP, catch-up, loss-streak assist, pity) and the meta parts of `docs/design/liveops-m7.md` (daily and weekly targets, login streak, season-pass card intake). Builds: main `21acf39`. It includes the M2-28 levels (PR 060/076) and the gem revive at 5 gems (decision 36).

## Inputs

| Source                                  | What it gives                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| M2-12 bots (PR 052/062)                 | Stage pace on L1 to L5: casual campaign median 6 battles / 6.8 min for 5 levels, 68% of casual sessions finish all 5                            |
| Scratch bot run (main, 200 seeds/level) | Casual win, stars, queens, x3 passes, coins per battle and loss nest damage on the current levels (table below)                                 |
| Scratch enemy-scale run (200 seeds)     | Casual win rate when enemy counts are scaled by 0.95, 0.90 and 0.85 (calibrates catch-up and loss-assist)                                       |
| M5-2a sim (`last_run.md`, ref 91fed5c)  | 30-day progression for no-ads, ads and payer personas. `91fed5c` is the meta-m5.md content on main today (no diff), so the run is current.      |
| Scratch sim variants                    | Same sim instrumented for first Epic/Legendary, slot unlock timing, bees owned at unlock, pity hits; plus a variant with pity counted per chest |

### Current levels, bot data (200 seeds per level, PROVISIONAL)

| Stage | Level            | Casual win | Casual 3 stars | Casual ≥ 2 stars | Aim 3 stars | Queens per battle (casual) | Bee passes through x3 gates per battle | Casual coins per battle (avg) | Median nest damage on a loss |
| ----- | ---------------- | ---------- | -------------- | ---------------- | ----------- | -------------------------- | -------------------------------------- | ----------------------------- | ---------------------------- |
| 1     | ftue-meadow      | 100%       | 83.5%          | 100%             | 100%        | 4.0                        | 0 (no x3 gate)                         | 103                           | n/a                          |
| 2     | dandelion-drift  | 98%        | 0.5%           | 57.5%            | 0%          | 7.2                        | 0 (no x3 gate)                         | 73                            | 97%                          |
| 3     | clover-run       | 71%        | 0%             | 19%              | 0%          | 5.6                        | 407                                    | 60                            | 86%                          |
| 4     | thistle-gauntlet | 68.5%      | 0%             | 13.5%            | 0%          | 6.6                        | 273                                    | 54                            | 84%                          |
| 5     | wasp-queen-nest  | 54.5%      | 0%             | 7%               | 13%         | 8.8                        | 648                                    | 48                            | 80%                          |

### Enemy-scale sensitivity (casual win, 200 seeds; wave counts and trickle scaled)

| Level            | E × 1.00 | E × 0.95 | E × 0.90 | E × 0.85 |
| ---------------- | -------- | -------- | -------- | -------- |
| clover-run       | 71%      | 81%      | 80%      | 88.5%    |
| thistle-gauntlet | 68.5%    | 69.5%    | 78%      | 83%      |
| wasp-queen-nest  | 54.5%    | 65%      | 74%      | 78.5%    |

The average is about +5 points at 0.95, +13 at 0.90 and +18.5 at 0.85, so about 1.2 to 1.4 win points per 1% easier. The sim assumes 2.0 (`win_sens`). The real effect of catch-up and loss assist is therefore about 35% smaller than the sim shows. That makes the 5% catch-up cap and the 0.85 floor safe; they are not too generous.

### QA box sessions (landed on main after this branch's base, `7229e05`): pace caveat

QA's 3 box sessions (`research/m2-12-qa-sessions.md`, PR 084, build `21acf39`; automated agent play on software render, **not human players**) are much slower than the bots. In 2 of 3 sessions L1 was lost 3 times with no win. One session won L1 at 192 s and then dropped off at L2 after 3 losses. Read literally, a new player may not reach stage 3 (slot 1) or stage 5 (slot 2) in session 1 at all, and the bot-based "n = 5 on day 1" is an upper bound. That doesn't change the meta conclusions (slots still open with bees owned), but it means FTUE/L2 issues (stuck hint, L2 −600 traps unexplained) come before meta pacing. Re-check slot timings once those are fixed.

## Findings

### 1. Unlock pacing vs stage progress: OK

The sim matches the bots on day 1: n = 5 after 6 battles (bots: 5 levels in a median 6 battles, 6.8 min). Loadout slot unlocks (sim, median with p10 to p90 in brackets):

| Slot | Stage | Day (no-ads / ads) | Battle (no-ads) | Non-worker bees owned at unlock (no-ads / ads) |
| ---- | ----- | ------------------ | --------------- | ---------------------------------------------- |
| 1    | 3     | 1 / 1              | 3 (2 to 4)      | 3 / 4                                          |
| 2    | 5     | 1 / 1              | 6 (4 to 8)      | 4 / 5                                          |
| 3    | 8     | 2 / 2              | 10 (8 to 13)    | 6 / 7                                          |
| 4    | 12    | 3 / 3              | 16 (13 to 19)   | 7 / 8                                          |

- Every slot has at least as many owned bees as open slots when it unlocks (p10 included), so no slot opens empty.
- **Caveat: day 1 is optimistic.** The sim opens the free daily Wood, the daily-bonus Wood and any slot chest at the start of the day. In the game, the first win chest takes 15 min to unlock, and a first session reaches stage 5 in about 7 min. At slot 1 (stage 3, about 4 min in), a new player realistically has only the free daily Wood (3 cards, at most 3 bees, 80% Common). That still fills slots 1 and 2. **Recommendation (small, applied):** make the first win chest (battle 1 after the FTUE) unlock instantly, so the "Equip!" prompt at stage 3 (flow 3) always has bees to equip.
- **"Before players need them":** loadout power only changes difficulty on generated stages (n ≥ 6, the catch-up rule in the generator). Stages 3 and 5 are handmade and never scaled, so slots 1 and 2 open before any stage depends on P. Slots 3 and 4 (stages 8 and 12) open on days 2 to 3, about when expectedP reaches 10 to 18. OK.

### 2. Chest and card intake vs spec: the boss Gold chest is missing from the sim

- Sim cards per 30 days: no-ads 746, ads about 1,010, payer 1,073. Liveops says about 1,000 per 28 days for the ad-watcher. That matches.
- **The sim omits the guaranteed Gold chest on boss wins** (meta-m5: Gold = "5% of wins, boss wins"). It only rolls 5% Gold on every win. A boss comes every 5th stage, about once a day at 5 stages/day, and the casual boss win rate is about 55%. So boss wins add about 1 Gold (12 cards, 200 to 400 coins) every 1 to 2 days, roughly **+6 to 12 cards/day (+15 to 30%)** that neither expectedP nor the 15% premium cap math includes. Premium share would fall a little (good). expectedP is about 10% low for the ads player, so payers and ads players would sit above it.
- **Coins per win:** the sim uses a uniform 50 to 125 (mean 87.5, from `rewards.ts`). The casual bot earns about 48 to 73 per battle on L2 to L5, with wins around 65 to 90. That's close enough; fine within PROVISIONAL.
- **Gem source "levels %10"** (meta-m5 currencies) has no amount, and the sim leaves it out. The spec has to give a number.

### 3. Time to first Epic / Legendary, and pity: the spec and the sim disagree

| Persona | First Epic, day (battle) | First Legendary, sim pity (per **card**, 40 cards) | First Legendary, spec pity (per **chest**, 40 chests) |
| ------- | ------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| no-ads  | 2 (6); p90 day 5         | day 3 (battle 12)                                  | day 7 (battle 36); p10 to p90 day 3 to 8              |
| ads     | 2 (6); p90 day 4         | day 2 (battle 8)                                   | day 5 (battle 28); day 2 to 6                         |
| payer   | 1 (6)                    | day 2                                              | day 5                                                 |

- **Spec:** "Legendary guaranteed by 40th **chest** opened without one". **Sim:** the pity counter goes up per **card**, so there are 15 to 22 pity Legendaries per 30 days versus 1 to 3 per chest.
- The expectedP table was retuned from this sim. **With per-chest pity (as specced), the ads player sits at only 87% of expectedP (median, days 3 to 30), and no-ads at 80%** (target about 85%; 76% minimum). Payer: 92%. Catch-up then runs at its 0.95 floor for no-ads players almost all month.
- **Recommendation (big, NOT applied, needs MON):** keep pity per chest (40 chests is the conventional, readable rule; per-card pity would hand out about 20 Legendaries a month and make them feel common). MON fixes `economy_sim.py` to count per chest and adds the boss Gold chest. Then retune expectedP to the new ads-player median. Expect roughly × 0.87 to 0.9 after the Gold-chest addition partly offsets it. Until that re-run, treat the expectedP table as about 10% high.
- First Epic on day 2 (about battle 6) is fine. Royal on login day 7 also guarantees one Epic.

### 4. Catch-up and loss-streak assist: OK, with one gap in the spec

- Catch-up (max 5%) and loss assist (0.95 after 2 losses, 0.90 after 3+, floor 0.85) are worth about +5, +13 and +18.5 casual win points (table above). Under the bot calibration, a stuck boss player at 54.5% goes to about 74% after 3 losses.
- How often assist triggers: at casual rates, 2 losses in a row on the same stage happens about 10% of the time on L4 and 21% on the boss; 3 losses about 3% and 9%.
- **Spec gap:** catch-up says "the generator scales E", but loss assist doesn't say which levels. **Recommendation (applied as a note):** loss assist applies to every stage including the handmade L2 to L5, scaling wave counts, trickle rate and boss burst/repeat counts (not the Matriarch). Catch-up stays generator-only (n ≥ 6).
- Revive interplay: median nest damage on a loss is 80 to 97%. So nearly every loss passes the 25% revive threshold and the "≥ 60% nest damage" Wood-chest roll. The 25% Wood roll on losses is effectively "25% of all losses".

### 5. Daily targets and streaks: two targets can't be done early on, one is trivial

- **"Earn 3 stars on any level × 2": almost impossible after the FTUE.** Casual 3-star rate is 0 to 0.5% on L2 to L5. The aim bot reaches 0% on L2 to L4 and 13% on the boss. Only the FTUE level gives 3 stars, and replays of L1 are a normal level. **Recommendation (applied, small):** change it to "Earn 2+ stars on any level × 2" (casual 7 to 57% per battle). Also flag to ENG/DES that the 3-star threshold (hive ≥ 90%) is out of reach on the current levels. That's a stars-curve issue for M2 (STARS-1, below).
- **"Pass x3 gates × 10" is ambiguous and can't be done on L1 and L2.** It counts bees, not gate passes, so it's 270 to 650 per battle on L3+ and 0 on L1/L2 (no x3 gate). **Recommendation (applied):** "Pass an x3 gate in 3 battles", offered only from stage 3.
- **"Defeat hornets × 30":** there are no hornets on L1/L2. **Recommendation (applied):** offered only from stage 3.
- **"Launch queens × 5" is done in one battle** (4 to 9 queens per battle). Raise the count to 15 (about 2 to 3 battles).
- Day-1 daily-bonus odds as specced: only 3 of the 6 pool targets can be done on L1/L2, so a full daily set is about 20% likely even with the free reroll. The sim assumes 100% every day (Wood chest + 110 XP per day), a small overestimate on day 1 only. After the fixes above, day 1 draws only from targets a new player can finish.
- **Login streak and weekly targets:** "Beat a boss level × 2" per week is fine (about 1 boss a day). "Win 25 battles" fits 4.2 wins/day (about 29 a week). The sim assumes a perfect login streak and 3 of 5 weekly targets; that can't be checked without player data (PT-A). Win streak bonus +20%/+40% coins: casual 3-win streaks are common on L1 to L3, rare on L4/L5.

### 6. Hive rooms and account XP: under-specified, not in the sim

- The room cap is "player level / 2", but there is **no XP-per-level curve** in the spec. `playerLevel`/`xp` are in the save plan with no table. **Recommendation (small, applied as a TODO line):** DES to add an account XP curve in M5-1b (proposal: XP = pass XP sources; level n needs 100 × n XP).
- None of the four rooms are in the sim. Pollen Lab (+1 card per chest every 2 levels, up to +3) can add up to +25% cards from Wood chests. MON should include rooms in the next sim run before costs are final.

### 7. Season pass (meta side): OK

Premium share is 4.5% of cards (cap 15%). The premium share of Epics is 19.4% (watch line at 18%: above, but the payer − no-ads Epic level gap is +0.67 < 1, so tier 18 stays). Tier 30 is reached around day 27 to 28 at 270 XP/tier. With the boss Gold chest added, premium share falls further.

## Spec vs code deltas (main `21acf39`)

Nothing in the meta is built yet. The only shipped pieces are coins and gems.

| Spec item                                                                                  | Code today                                                                                                                    | Delta                                                                           |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Coins (earn per battle)                                                                    | `src/sim/rewards.ts` `computeRewards`: win 50 + hive share × 30 + timeLeft / 2; loss nest damage × 20; 2X rewarded multiplier | Built. Nothing to spend coins on yet (no upgrades or rooms)                     |
| Nectar Gems                                                                                | `SaveData.gems`, `applyPurchase` (sandbox SKUs), `debitGems` (gem revive, 5 gems)                                             | Purchase + revive spend only; no target, pass or level %10 income               |
| Stars                                                                                      | `computeRewards` stars (hive ≥ 50% / ≥ 90%), `bestStars`, `nextLevelIndex`                                                    | Built                                                                           |
| Stage n / campaign                                                                         | 5 handmade levels (`src/levels/*.json`); `nextLevelIndex` stays on the last level                                             | No generator (M7-1), so stages 6+, slots 3 and 4, and catch-up can't be reached |
| Bees roster, pollen, levels                                                                | none (`src/art/skins.ts` is cosmetic skins only)                                                                              | Not built                                                                       |
| Loadout (4 slots, P)                                                                       | none                                                                                                                          | Not built                                                                       |
| Chests (slots, timers, odds, pity, new-bee protection)                                     | none                                                                                                                          | Not built                                                                       |
| expectedP, catch-up, loss assist (`difficulty.*` config)                                   | none; no remote config yet (M6-5)                                                                                             | Not built                                                                       |
| Hive rooms, builders                                                                       | none                                                                                                                          | Not built                                                                       |
| Account XP / playerLevel                                                                   | none                                                                                                                          | Not built; curve not specced                                                    |
| Daily / weekly targets, login streak, win streak, season pass                              | none                                                                                                                          | Not built (M7-3)                                                                |
| Save additions (`bees`, `loadout`, `chests`, `pityLegendary`, `hive`, `playerLevel`, `xp`) | `SaveData` has coins, gems, bestStars, skins, ftueDone, ad and revive counters only                                           | Not built (M4 cloud save; M4-5a gem ledger must cover chest and pass grants)    |
| Analytics for meta (chest_open, bee_upgrade, loadout_change, target_complete)              | none in `src/analytics/analytics.ts`                                                                                          | Not built                                                                       |
| `isEventFinalLevel`                                                                        | stub returning false (`reviveGems.ts`)                                                                                        | Stubbed until M7-3 (as planned)                                                 |

## Recommended spec changes

Applied in this PR (small):

1. `meta-m5.md`: the first win chest after the FTUE unlocks instantly (finding 1).
2. `meta-m5.md`: loss-streak assist applies to every stage, including handmade L2 to L5 (wave counts, trickle, boss burst/repeat, not the Matriarch). Catch-up stays generator-only (finding 4).
3. `meta-m5.md`: pity is per chest opened (spec wording kept). An explicit note says the expectedP table is pending a MON re-run with per-chest pity and the boss Gold chest (finding 3).
4. `meta-m5.md`: TODO for an account XP curve (finding 6).
5. `liveops-m7.md`: daily pool fixes ("2+ stars × 2", "x3 gate in 3 battles" from stage 3, hornets from stage 3, queens 5 → 15) (finding 5).

Flagged, NOT applied (bigger, or owned by another team):

- **MON (M5-2a re-run):** count pity per chest, add the guaranteed Gold chest on boss wins, add the "levels %10" gem amount once specced, add hive rooms, and calibrate `win_sens` to about 1.3 (bot data) instead of 2.0. Then **retune expectedP** (expect about −10%).
- **DES/ENG STARS-1:** the 3-star threshold (hive ≥ 90%) is unreachable on L2 to L5 even for the aim bot. The star thresholds or hive damage need a pass before stars gate anything.
- **DES M5-1b:** account XP curve and the gem amount for "levels %10".
- Re-validate everything here with QA sessions, then PT-A if approved.

## Method (reproducible, scratch only)

- Bots: `scratch/meta.ts` (casual and aim bots from `tests/bots.ts`, 200 seeds per level, rewards from `computeRewards`), `scratch/esens.ts` (enemy counts scaled), built with rolldown and run on the box. Scratch worktree `/workspace/scratch/m5` @ main `21acf39`.
- Sim: `python3 monetization/sim/economy_sim.py --design-ref main --runs 200` (identical to `last_run.md`), plus two copies: per-chest pity (`econ_pity_chest.py`) and an instrumented copy (`meta_sim.py`) for first-drop and slot timings.

## Addendum (M5-1b): expectedP refit after the M5-2a rerun

The M5-2a rerun (`monetization/m5-2a-rerun` @ `4db39df`) added per-chest pity, the boss Gold chest and rooms. Median P vs the old expectedP: no-ads 94%, ad-watcher 100%, payer 103%, no hard wall by day 30 (stages 125 to 128, about 4.2 stages/day). The recommended ~10% cut above (sim finding and MON item above) is **cancelled**. expectedP in `meta-m5.md` is now refit to the ad-watcher median, with the early points raised: 3:5, 5:7, 10:18, 14:24, 25:34, 36:42, 52:46, 74:54, 111:61, 160:71 (160 unverified). Interpolation is unchanged.
