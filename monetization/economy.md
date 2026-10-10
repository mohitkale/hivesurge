# M5-2 — Economy sources/sinks + 30-day sim

**Status: provisional.** M5-1 (meta design) is not yet written, so card/building costs below are ASSUMPTIONS. Re-run when M5-1 lands.

## Currencies
| Currency | Sources | Sinks |
| --- | --- | --- |
| Coins (soft) | battle wins, win multiplier ad, chests, daily login, away earnings, starter pack | card upgrades, global fire-rate buff, hive building upgrades |
| Gems (hard) | IAP, small drips (daily login 5, season free track, achievements) | chest timer skip, rewarded-alternative (G8), cosmetics, season pass not purchasable with gems |
| Skip tickets | IAP, season track | claim a rewarded reward without watching |
| Cards | chests (odds shown), season, rewarded pack (cap 1/day) | upgrades |

## 30-day sim (F2P, no ads watched — worst case)
ASSUMPTIONS: 6 battles/day, 70% win, 40 coins/win, 10/loss, daily login 100 coins; level-N upgrade cost = 100·1.35^N; required power = upgrades needed to keep expected win-rate ≥ 60% grows by 1 level per ~2 days.

| Day | F2P upgrade level | Level needed (assumed) | Coins banked |
|---|---|---|---|
| 1 | 2 | 0 | 51 |
| 3 | 4 | 1 | 195 |
| 7 | 6 | 3 | 558 |
| 10 | 7 | 5 | 811 |
| 14 | 9 | 7 | 34 |
| 21 | 10 | 10 | 547 |
| 30 | 11 | 15 | 1110 |

Days where F2P falls behind needed level: [22, 23, 24, 25, 26, 27, 28, 29, 30].

Interpretation: with these assumptions the exponential cost curve outpaces flat income in the late window — that is a **soft wall to tune in M5-1**, not a paywall: G7 requires (and the acceptance "sim shows no hard paywall" is NOT yet met)  the needed-level curve to be flattened (sawtooth/league resets) or coin income to scale with league so the F2P line stays ≥ needed line. Ads/IAP must only *accelerate*, never be required. Sim is a ~10-line loop over the constants above (re-derive in a sheet or script); replace constants with M5-1 values.
