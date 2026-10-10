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

## 30-day sim (M5-2a) — reproducible, reads design @ 91fed5c

`python3 monetization/sim/economy_sim.py [--seed 42] [--runs 200] [--design-ref 91fed5c] [--power-k 0.5] [--win-sens 2.0]`. Output is saved in [`sim/last_run.md`](sim/last_run.md) (k = 0.5 and k = 0.3 runs, plus sensitivity runs).
The script reads from `meta-m5.md` @ 91fed5c:

- `expectedP(n)` (n = stage);
- the easier-only scaling `clamp(1 + 0.01(P − expectedP), 0.95, 1.00)`;
- `difficulty.lossAssist = [[2, 0.95], [3, 0.90]]` (consecutive losses, reset on a win) and `difficulty.scaleFloor = 0.85`.

It reads XP per tier (270) from `liveops-m7.md`.

New model term (DES proposal, values are ASSUMPTIONS): win rate = 0.70 − win-sens × (scale − 1) + **k × (P/expectedP − 1)**, clamped to 5–95%. P/expectedP is treated as 1 where expectedP = 0. I verified the DES scratch `/tmp/sim_powerterm.py` against this: its `P/max(1, expectedP)` gives a ratio of −1 at stages 1–2 (P = 0, expectedP = 0), which wrongly penalises every new player. That is fixed here.

**Results (seed 42, 200 runs, win-sens 2.0)**

|                                                  | k = 0.3           | k = 0.5           |
| ------------------------------------------------ | ----------------- | ----------------- |
| Day-30 stage, no-ads / ads / payer               | 135.5 / 132 / 134 | 132 / 134 / 135   |
| Median P/expectedP d3–30, no-ads / ads / payer   | 92% / 104% / 105% | 93% / 104% / 106% |
| Payer season tier, day 30                        | 33                | 33                |
| Premium card share (cap 15%, all cards)          | 4.5% (48/1061)    | 4.5% (48/1073)    |
| Premium Epics of season Epics                    | 19.5%             | 19.4%             |
| Epic level gap, payer − no-ads (mean of 3 Epics) | +0.67             | +0.67             |
| Hard wall (no-ads stall ≥ 3 days)                | no (0)            | no (0)            |

Day-30 stage (no-ads / ads / payer) under other settings:

- k = 0, seed 42: 139 / 130 / 129 (inverted)
- seed 7: k = 0.5 gives 133 / 134 / 136; k = 0.3 gives 135.5 / 133 / 134
- win-sens 1.0: k = 0.5 gives 128 / 132 / 135; k = 0.3 gives 128 / 132 / 133

**Findings**

- Easier-only scaling removed the "payers get harder enemies" penalty: the scale is never above 1.00.
- At k = 0.3 the no-ads player still clears about 1–3 more stages than ad-watchers and payers at win-sens 2.0 (consistent across seeds). At k = 0.5 the order is payer ≥ ads ≥ no-ads on both seeds and at win-sens 1.0, but only by 1–4 stages, so it is not pay-to-win.
- **Recommendation: k = 0.5** for the M5-4 balance target, to be validated in playtests (M2-12) by measuring the win rate vs P/expectedP slope; k and win-sens are both unmeasured.
- The tier-18 → gems trigger (Epic gap > 1 level) is **not** hit: the gap is +0.67.
- The 15% premium cap (all cards) passes at 4.5%.
- The ad-watcher sits at about 104%, not 100%. That's fine: the catch-up rule only acts below expectedP.

## M5-11 guardrail check (no paid random items)

`python3 monetization/sim/check_guardrails.py` (exits 1 on violation) runs over [`skus.json`](skus.json). Every paid SKU must:

- have `random:false`;
- grant no chests, cards, packs or spins;
- have every season-pass `contents` tier set to `random:false`;
- grant noAds (G6);
- cost at least $2.

**Current result: PASS (exit 0).** `season_pass.contents` is generated from the 209606b premium track: named bee cards, coins, gems and cosmetics only. Free-track chests are earned in play and their odds are shown, so they are out of scope. Gem chest skips only speed up chests earned in play; REV should confirm this in M5-10.
