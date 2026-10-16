# Ad placements — 21 reference placements → Hive Surge decisions

Existing code: rewarded `win_double`, `revive`; interstitial at transitions (3-min gap, 2 ad-free battles, none after rewarded or after a declined rewarded offer (decision 43), none if noAds). Portal caps also apply (CrazyGames: midgame ≤ 1 / 3 min, auto; Poki/Google decide timing). Caps below are ASSUMPTIONS to tune via remote config.

| #     | Placement                              | Decision           | Per-session cap                  | Daily cap | Cooldown           | Notes                                                                  |
| ----- | -------------------------------------- | ------------------ | -------------------------------- | --------- | ------------------ | ---------------------------------------------------------------------- |
| 1     | Rewarded win multiplier (`win_double`) | v1                 | 6                                | 20        | none (per win)     | equal-size "No thanks" (G9)                                            |
| 2     | Rewarded pre-battle boost              | v1 (M5-5)          | 6                                | 20        | 1 per battle       | never required (G7); caps = code `AD_CAPS` (decision 43)               |
| 3     | Rewarded revive (`revive`)             | v1                 | 3                                | 10        | 1 per battle       | hidden in FTUE                                                         |
| 4     | Rewarded upgrade contribution          | v2                 | 2                                | 5         | 10 min             |                                                                        |
| 5     | Rewarded chest timer skip              | v1 (M5-5)          | 3                                | 8         | 1 per chest        | never on first chest                                                   |
| 6     | Rewarded energy refill                 | rejected           | –                                | –         | –                  | no energy in main loop                                                 |
| 7     | Rewarded free card pack (daily pack)   | v1 (M5-5)          | 1                                | 1         | 24 h               | odds shown                                                             |
| 8     | Rewarded base shield                   | v2 (after raids)   | 1                                | 1         | 24 h               |                                                                        |
| 9     | Rewarded lucky spin                    | v2                 | 1                                | 1         | 24 h               | odds shown, free daily spin too                                        |
| 10    | Rewarded away doubler                  | v1 (M5-5)          | 1                                | 3         | session start only |                                                                        |
| 11    | Interstitial between battles           | v1, softened       | 4                                | 15        | 3 min (code)       | off for any payer; never after rewarded; after battle 5+ (G1 proposal) |
| 12    | Banner on menus                        | v2, own-site only  | –                                | –         | –                  | only screens ≥5 s, never in battle; off for payers                     |
| 13–21 | IAP placements                         | see iap-catalog.md | max 1 pop-up offer/session (G13) |           |                    |                                                                        |

Global: ≤ 12 rewarded/session, ≤ 30 rewarded/day, ≤ 4 interstitials/session.
