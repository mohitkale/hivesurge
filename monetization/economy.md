# M5-2 — Economy sources/sinks + 30-day sim

**Status: provisional.** M5-1 (meta design) is not yet written, so card/building costs below are ASSUMPTIONS. Re-run when M5-1 lands.

## Currencies

| Currency     | Sources                                                                          | Sinks                                                                                         |
| ------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Coins (soft) | battle wins, win multiplier ad, chests, daily login, away earnings, starter pack | card upgrades, global fire-rate buff, hive building upgrades                                  |
| Gems (hard)  | IAP, small drips (daily login 5, season free track, achievements)                | chest timer skip, rewarded-alternative (G8), cosmetics, season pass not purchasable with gems |
| Skip tickets | IAP, season track                                                                | claim a rewarded reward without watching                                                      |
| Cards        | chests (odds shown), season, rewarded pack (cap 1/day)                           | upgrades                                                                                      |

## Sources/sinks sheet

Full sheet: [`economy-sources-sinks.csv`](economy-sources-sinks.csv) (CODE = `src/sim/rewards.ts` / `platform.ts` on `fix/pr-002-review`; META/LIVE = `docs/design/meta-m5.md` / `liveops-m7.md` on `design/m2-specs`; ASSUMPTION marked).

## 30-day sim (M5-2a) — re-run after M5-1 validation (design 126a7bc, PROVISIONAL)

Run: `python3 monetization/sim/economy_sim.py [--design-ref 126a7bc] [--win-sens 1.3] [--no-rooms] [--no-boss-gold] [--boss-win-delta -0.15] [--weekly-gems 35] [--revive-gems 5]`. Output is in [`sim/last_run.md`](sim/last_run.md).

Model changes, all following `docs/design/validation-m5.md` (PR 081):

1. **Pity per chest** (40 chests without a Legendary), not per card.
2. **Boss wins grant a Gold chest** (every 5th stage). ASSUMPTION: boss win rate is 15 points lower (casual bot 54.5% on wasp-queen-nest).
3. **win-sens default 1.3** (bots: 1.2–1.4 win points per 1% enemy change).
4. **Hive rooms** from the meta-m5.md table: Pollen Lab (+1 card per chest every 2 levels), Honey Store (20 coins/h per level, 8 h cap), Wax Walls and Brood Cell. Costs and times use the L1 and L5 rows. ASSUMPTIONS:
   - geometric interpolation and extrapolation between those rows;
   - one builder, priority Pollen Lab > Honey > Wax > Brood, after bee upgrades;
   - room cap = account level / 2, with account XP = pass XP sources and level L → L+1 needing 100 × L XP (the M5-1b proposal; the curve is not specced);
   - sessions at 0/6/12 h;
   - **Wax Walls and Brood Cell effects are not modelled in win rate** (P excludes rooms).
5. **Daily targets** follow the 126a7bc pool: queens 15, x3 gate and hornet targets from stage 3, "2+ stars × 2" (5 gems).
   - 3 targets are drawn per day from the stage-gated pool.
   - Per-target completion is 0.70–0.95 (ASSUMPTION).
   - The bonus (Wood chest + 50 XP) needs all 3 done, and is 20% on day 1.

**Results (seed 42, 200 runs):**

| Persona    | Median P/expectedP d3–30 | Day-30 stage | Season tier |
| ---------- | ------------------------ | ------------ | ----------- |
| no-ads     | 94% (89–103%)            | 125          | 29          |
| ad-watcher | **100%** (97–111%)       | 126          | 30          |
| payer      | 103%                     | 128          | 30          |

- **Hard wall: none** (longest no-ads stall 0 days). The enemy scale is never above 1.00.
- **Pity Legendaries:** 0–1 per 30 days per persona. Spec expectation is 1–3; the old per-card sim gave 15–22.
- **Premium share:** 3.3% of about 1,455 cards (cap 15%). Premium Epics are 13.0% of season Epics, below the 18% watch line.
- **Epic gap:** payer − no-ads is +0.67 levels, so the tier-18 trigger is not hit.
- **Revive at 5 gems:** about 1.6–1.8 eligible defeats/day. Free gems are about 280 per 30 days (9.3/day, now including the 2+ stars target), so coverage is 100%. Without weekly gems: 145 gems, 55–59% coverage.

**Reconciling with design's expectation (ad-watcher ~87%):** the gap comes from which changes are included.

- With per-chest pity and the new daily targets but **no boss Gold and no rooms** (`--no-rooms --no-boss-gold --boss-win-delta 0`), the ad-watcher is 86% and no-ads 80%. That matches validation-m5.md.
- The boss Gold chest and Pollen Lab add enough cards to bring the ad-watcher back to about 97–100%. Without rooms it is 97%.

**Suggested expectedP retune (do NOT cut ~10% across the board):** refit to the new ad-watcher median P on the first day each run reaches stage n.

| Stage n | Current | Refit                                | Ratio                     |
| ------- | ------- | ------------------------------------ | ------------------------- |
| 3       | 2       | 5                                    | 250%                      |
| 5       | 5       | 7                                    | 140%                      |
| 10      | 13      | 18                                   | 138%                      |
| 14      | 21      | 24                                   | 114%                      |
| 25      | 30      | 34                                   | 113%                      |
| 36      | 39      | 42                                   | 108%                      |
| 52      | 46      | 46                                   | 100%                      |
| 74      | 54      | 54                                   | 100%                      |
| 111     | 63      | 61                                   | 97%                       |
| 160     | 71      | not reached (day-30 stage about 126) | keep 71; slope unverified |

- Early stages (n ≤ 36) are **too low**, by 8–40%, which matters only on generated stages n ≥ 6. Late stages are about right.
- A uniform −10% would make it worse. Proposal: adopt the refit points.
- Pace is now about 4.2 stages/day (126 at day 30, was 159), because of the boss penalty and win-sens 1.3. Liveops XP and tier timing are still OK (tier 30 by day 30).

## M5-11 guardrail check (no paid random items)

`python3 monetization/sim/check_guardrails.py` (exits 1 on violation) runs over [`skus.json`](skus.json). Every paid SKU must:

- have `random:false`;
- grant no chests, cards, packs or spins;
- have every season-pass `contents` tier set to `random:false`;
- grant noAds (G6);
- cost at least $2.

**Current result: PASS (exit 0).** `season_pass.contents` is generated from the 209606b premium track: named bee cards, coins, gems and cosmetics only. Free-track chests are earned in play and their odds are shown, so they are out of scope. Gem chest skips only speed up chests earned in play; REV should confirm this in M5-10.

## Gem income assumption (M2-21a)

The sim credits 35 weekly gems (boss 20 + event 15) to **every** persona. That is 140 of the ~230 free gems in 30 days. All gem-income results, including the M2-21a revive coverage in `revive-m2-21a.md`, depend on this assumption. Without it, free income is about 90 gems per 30 days and revive coverage at 10 gems is about 38–41%. Treat the numbers as upper bounds until weekly-target completion is measured.
