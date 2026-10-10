# M5-3 — Mob Control-style meta & pricing benchmark; regional loot-box restrictions

**Acceptance:** report + list of regions where paid random items are disabled. **Status: done** (report here, not yet in `docs/research/`).

## 1. Meta systems in Mob Control (source: [Reverse Nerf](https://reversenerf.com/voodoos-breakthrough-with-mob-control-their-first-hybridcasual-success/))

- **Base (scene-building):** blue bricks from every battle, amount scales with performance; numbered bases scale to 999. Base milestones award stars.
- **Champions League:** star-based leagues, promotion at top position; Immortal tier → God Tier Cup (top 10k, 4 weeks, cosmetic "G" tag only). Leaderboards "filled with bots" in buckets tuned for meaningful position jumps.
- **Cards:** Cannons, Champions, Mobs, Ultimates; one of each per loadout; upgrades via duplicates (scaling) + coins; star bundles at 3 level milestones.
- **Coins:** only sink is card upgrades/global cannon buffs; "generous seeding" early, pressure later.
- **Battle pass:** $4.99 (as low as $2.99 with VIP); ~20% of IAP revenue (data.ai, July 2023, via Reverse Nerf). Daily/weekly/seasonal challenges; one-tap "equip loadout for challenge".
- **Skip-its:** currency to skip _rewarded_ ads; >18% IAP revenue (data.ai July 2023). Any purchase removes forced ads only.
- **Soft currency packs:** >20% IAP revenue. Club subscriptions replaced the £9.99 Triple Cannon: monthly £5.99/£17.99, lifetime £29.99/£119.99.
- Net IAP grew from <$100k/month to ~$2m/month (same source).
- Further price points already cited in the master plan: Starter Pack $2.99, Save the loots $0.99, Medium Card Pack Bundle $1.99 ([App Store](https://apps.apple.com/us/app/mob-control/id1562817072)).
- Mob Control's card meta was built "akin to Clash Royale but without the chest opening timers" ([Naavik](https://naavik.co/deep-dives/evolution-of-hybridcasual-deepdive/)).
- Economy throttles: card-count requirements and building timers pace earnings that are "virtually uncapped" ([Adrian Crook](https://adriancrook.com/how-to-build-engaging-economies-in-hybridcasual-games-lessons-from-crowd-city-and-mob-control/)).

**Inference for Hive Surge (test prices for M5-2, sandbox only):** No Ads/starter $2.99, small offer $0.99, pass $4.99, pack bundle $1.99. Prefer fixed-content bundles for real money; keep random chests earned-only (see §2).

## 2. Loot-box rules by region

| Region         | Rule                                                                                                                                                                                       | Source                                                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Belgium**    | Paid loot boxes treated as illegal gambling; operators risk up to 5 years prison / €800,000 fines (doubled for minors). **Disable paid random items.**                                     | [Belgian Gaming Commission 2018 report](<https://gamingcommission.be/sites/default/files/2021-02/2018%20Rapport%20-%20Loot%20boxen%20(NL).pdf>)                                                                          |
| Netherlands    | Lawful since the March 2022 Council of State ruling; consumer guidelines require disclosure of paid random content and probabilities. Many firms still disable them for NL out of caution. | [GamesIndustry.biz 2024](https://www.gamesindustry.biz/loot-box-state-of-play-2024-another-trip-around-the-world-of-regulation), [IJLIT (OUP)](https://academic.oup.com/ijlit/article/doi/10.1093/ijlit/eaaf011/8196018) |
| Mainland China | Mandatory probability disclosure (Survivor.io's publisher fined ¥10,000 in 2023).                                                                                                          | [GamesIndustry.biz 2024](https://www.gamesindustry.biz/loot-box-state-of-play-2024-another-trip-around-the-world-of-regulation)                                                                                          |
| South Korea    | Since 22 Mar 2024 must disclose each item's odds in game, website and ads; corrective orders, up to 2 yrs / KRW 20m.                                                                       | [Kim & Chang](https://www.kimchang.com/en/insights/detail.kc?idx=31203&sch_section=4)                                                                                                                                    |
| Taiwan         | Specific probability disclosure rules.                                                                                                                                                     | [GamesIndustry.biz 2024](https://www.gamesindustry.biz/loot-box-state-of-play-2024-another-trip-around-the-world-of-regulation)                                                                                          |
| Japan          | "Complete gacha" prohibited; other gacha self-regulated with odds disclosure.                                                                                                              | [Promise Legal](https://blog.promise.legal/loot-box-laws-game-developers/)                                                                                                                                               |
| EU/UK ratings  | PEGI age-rating change for loot boxes reported as taking effect June 2026 (verify details before launch).                                                                                  | [Promise Legal](https://blog.promise.legal/loot-box-laws-game-developers/)                                                                                                                                               |
| App stores     | Apple 3.1.1 and Google Play require odds disclosure before purchase.                                                                                                                       | [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/), [Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)                                             |

### Regions where paid random items must be disabled

1. **Belgium** (legal requirement).
2. **Netherlands**: _optional_ conservative disable. Not legally required since 2022, but industry often does it; if enabled, show per-item odds.

Everywhere else: show per-item odds before purchase (satisfies China/Korea/Taiwan/NL/app stores).
**Recommendation:** no paid random items at all on web (fixed bundles only; chests earned by play/ads with odds shown). That removes the geo-gating requirement entirely.
