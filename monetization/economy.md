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

## 30-day sim (M5-2a) — reproducible, reads design @ 209606b

`python3 monetization/sim/economy_sim.py [--seed 42] [--runs 200] [--design-ref 209606b]`. Output is saved in [`sim/last_run.md`](sim/last_run.md).
The script reads its tables from git at `--design-ref`:

- `meta-m5.md`: bee roster, `expectedP(n)` points (= remote config `difficulty.expectedP`) and the enemy scaling `clamp(1 + 0.03(P − expectedP(n)), 0.90, 1.15)`.
- `liveops-m7.md`: season pass free and premium tracks, and XP per tier.
- CODE `rewards.ts`: win/loss coins.

P = equipped loadout only (slots at n = 3/5/8/12), worker excluded (META).
Target = expectedP(n), i.e. 100% of the free ad-watcher by design definition.

ASSUMPTIONS:

- 6 battles/day in 3 sessions; level n advances +1 per win.
- Win rate is 70% at enemy scale 1.0 and drops 2 points per +1% enemies, so two-sided scaling feeds back into progression.
- One chest unlocks per gap between sessions.
- The rewarded daily pack is a Wood chest.
- 3 of 5 weekly targets are completed.
- C/R upgrade costs for L7–10 are extrapolated (x2 per level).
- Hive rooms, idle coins, events and overflow conversion are not simulated.

Personas: `f2p_no_ads`, `f2p_ads` (the META baseline), and `payer_pass` (starter pack + season pass on day 1).

**Headlines (seed 42, 200 runs):**

- **No hard wall.** The no-ads free player gains levels every day; the longest stall is 0 days.
- **Below expectedP.** The no-ads free player sits at a median of 50% of expectedP over days 3–30 (minimum 45%), so they are on the −10% floor (enemies 0.90) from day 2 onward.
- **Premium card share:** 48 premium cards out of about 1,160 total cards over 30 days = **4.1%**, under the 15% cap.

**New issues for DES (not walls):**

1. **The expectedP curve is too steep for the modelled pace.** Even the free ad-watcher baseline sits at only about 55–70% of expectedP, not 100%. That puts all personas on the 0.90 floor, so the scaling never makes payers' games harder. Either levels advance slower than 1 per win (the sim assumption), or the expectedP points are too high, or the card/coin intake is too low. Proposal: retune `difficulty.expectedP` from this sim's f2p_ads median, or define level pace.
2. **Card intake mismatch.** liveops-m7.md assumes about 280 season cards from chests; the sim produces about 1,100 in 30 days (win chests, plus 2–3 Wood chests a day, plus login and free track). The premium share passes either way (48/280 ≈ 17% would exceed the cap), so the denominator matters. DES should confirm the intended chest pace.
3. **Arithmetic in liveops-m7.md:** the premium cards total **48** (2+6+12+5+20+3), not 40, and **13 Epic** (2 Orchid + 2+5 Leafcutter + 4 Honey Guard), not 9. There are 3 Legendary.

## M5-11 guardrail check (no paid random items)

`python3 monetization/sim/check_guardrails.py` (exits 1 on violation) runs over [`skus.json`](skus.json). Every paid SKU must:

- have `random:false`;
- grant no chests, cards, packs or spins;
- have every season-pass `contents` tier set to `random:false`;
- grant noAds (G6);
- cost at least $2.

**Current result: PASS (exit 0).** `season_pass.contents` is generated from the 209606b premium track: named bee cards, coins, gems and cosmetics only. Free-track chests are earned in play and their odds are shown, so they are out of scope. Gem chest skips only speed up chests earned in play; REV should confirm this in M5-10.
