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

## 30-day sim (M5-2a) — reproducible

`python3 monetization/sim/economy_sim.py [--seed 42] [--runs 200]` → output saved in [`sim/last_run.md`](sim/last_run.md).
Uses the CODE win/loss coin table and META chest, odds, pity, pollen and upgrade tables, plus LIVE daily targets and login cycle.
ASSUMPTIONS: 6 battles/day in 3 sessions, 70% win rate, one chest unlocks per gap between sessions, greedy upgrades, C/R upgrade costs L7–10 extrapolated x2/level, hive rooms/idle coins/overflow conversion/events/season pass not simulated. Target power = 85% of the median f2p_ads player (no design target exists yet; `expectedP(n)` in META is undefined).

**Headline (seed 42, 200 runs):** no hard wall. A free player who watches no ads makes power gains every day (longest stall: 0 days). They sit just under the target on days 1–6, then stay above it. At day 30, the starter-pack payer has 1.08x the power of a no-ads free player. META's generator scales enemies by power vs expectedP, which softens any gap further.

## M5-11 guardrail check (no paid random items)

`python3 monetization/sim/check_guardrails.py` (exit 1 on violation) over [`skus.json`](skus.json): every paid SKU must have `random:false`, must not grant chests/cards/packs/spins, must grant noAds (G6), and must cost at least $2.
**Current result: FAIL.** The season pass premium track in `liveops-m7.md` grants Silver, Gold and Royal chests plus un-named Epic/Legendary card bundles (tiers 1, 5, 12, 18, 20, 25). Proposed fix for DES (M7-2): replace them with named bee cards (fixed content), coins/gems, or cosmetics. Gem chest skips only speed up chests earned in play, so they pass; REV should still confirm this in M5-10.
