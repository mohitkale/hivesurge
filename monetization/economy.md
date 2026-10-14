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

## 30-day sim (M5-2a) — re-run vs M5-1b (design 101047a, PROVISIONAL)

Run: `python3 monetization/sim/economy_sim.py [--design-ref 101047a] [--seed 42] [--runs 200]`. Output (seeds 42, 7 and 1000) is in [`sim/last_run.md`](sim/last_run.md).
This builds on the 126a7bc re-run (per-chest pity, boss Gold, win-sens 1.3, rooms, stage-gated dailies; see PR 085) and adds three things from 101047a, read from `meta-m5.md`:

- **expectedP** = the M5-2a ad-watcher refit.
- **Account XP:** L → L+1 costs `150 + 20 × L`, replacing the old 100 × L assumption. XP sources are the same as pass XP.
- **Every 10th account level grants 25 gems.**
- **Wax Walls (+1.0 P per level, cap +10) and Brood Cell (+1.5 P per level, cap +7.5) count only in the win term** (`P_eff`), not in the easing clamp or expectedP.

**Results (200 runs):**

| Persona    | Median P/expectedP d3–30 (seed 42 / 7 / 1000) | Day-30 stage (42 / 7 / 1000) | Account level day 7 / day 30 |
| ---------- | --------------------------------------------- | ---------------------------- | ---------------------------- |
| no-ads     | 92% / 91% / 90%                               | 135 / 135 / 135              | 8 / 22                       |
| ad-watcher | 99% / 99% / 99%                               | 139 / 139 / 138              | 9 / 22–23                    |
| payer      | 103% / 102% / 102%                            | 140 / 140 / 141              | 9 / 23                       |

- **Ordering payer ≥ ad-watcher ≥ no-ads holds on every seed**, for both power and stage.
  - Seeds 42 and 7 share 157 of 200 run seeds (seed + i), so they are not independent; seed 1000 is fully independent and agrees.
- **Hard wall: none** (longest no-ads stall 0 days). The enemy scale is never above 1.00.
- **Premium share:** 3.1% (cap 15%); premium Epics 12.1–12.3%; Epic gap +0.67 (tier-18 trigger not hit).
- **Pity Legendaries:** 0–1 per month.
- **Revive at 5 gems:**
  - free gems are about 335 per 30 days (11.2/day, including 50 from levels 10 and 20); 1.3–1.4 eligible defeats/day; **coverage 100%**;
  - without weekly gems, 195 gems and **91–100%** (was 55–59% before the level gems).
- **Pace:** about 4.6 stages/day (135–140 at day 30, up from 125–128), because rooms now help the win term.

**Spec gaps / notes for DES:**

1. **Account level runs about 1–3 levels behind the design table** (day 7: 8–9 vs ~10; day 30: 22–23 vs ~25). The sim earns less than 330 XP/day because daily targets are completed at 70–95% (ASSUMPTION) and the daily bonus needs all 3. Either accept this or lower the curve slightly (e.g. `140 + 20L`).
2. **Day 1–2 P/expectedP is low** (54–89%) because expectedP(3) = 5 and (5) = 7 were raised. This is harmless: stages 1–5 are handmade and never scaled.
3. The expectedP(160) = 71 point is still not reached (day-30 stage about 139).
4. The sim gives Wax Walls and Brood Cell P_eff to all personas equally (as designed). Their build priority is an ASSUMPTION.

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
