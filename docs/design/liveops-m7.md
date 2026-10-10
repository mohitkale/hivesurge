# Live ops design (M7-2): events, daily/weekly targets, streaks, season pass

Owner: DES. Implements in M7-3, all driven by remote config (M6-5), tested with a clock mock. Reward values provisional pending M5-2 economy sim. Times in UTC reset 00:00.

## Daily targets (3 per day, reroll 1 free per day)

| Pool target                                                                                        | Count | Reward    |
| -------------------------------------------------------------------------------------------------- | ----- | --------- |
| Win battles                                                                                        | 3     | 100 coins |
| Launch queens                                                                                      | 5     | 80 coins  |
| Pass x3 gates                                                                                      | 10    | 80 coins  |
| Defeat hornets                                                                                     | 30    | 100 coins |
| Earn 3 stars on any level                                                                          | 2     | 5 gems    |
| Open chests                                                                                        | 2     | 60 coins  |
| Completing all 3 grants a Daily bonus: Wood chest + 50 pass XP. Each target also gives 20 pass XP. |

## Weekly targets (5 per week, Monday reset)

| Target                           | Count  | Reward       |
| -------------------------------- | ------ | ------------ |
| Win battles                      | 25     | Silver chest |
| Beat a boss level                | 2      | 20 gems      |
| Complete daily bonus             | 5 days | Gold chest   |
| Upgrade bees                     | 5      | 500 coins    |
| Event points                     | 1500   | 15 gems      |
| Each weekly target: 100 pass XP. |

## Login streak (7-day cycle)

| Day    | 1         | 2          | 3      | 4         | 5            | 6       | 7           |
| ------ | --------- | ---------- | ------ | --------- | ------------ | ------- | ----------- |
| Reward | 100 coins | Wood chest | 5 gems | 300 coins | Silver chest | 10 gems | Royal chest |

- Missing a day: streak freezes for 1 day (1 free "honey jar" saver per week); second miss resets to day 1. No paid streak repair.
- Win streak (in battle): 3 consecutive wins = +20% coins on next win, 5 = +40%, capped. Loss resets. Shown as a flame on Play button.

## Season pass (28 days, 30 tiers)

- XP per tier: 300. Sources: win 30, loss 10, targets as above. Free player at 6 wins/day + dailies reaches about tier 30 in 26 days.
- Premium track via sandbox purchase (test price 4.99 USD). Retroactive: buying later grants all earned premium tiers.
- M5-11 guardrail: the premium track is paid, so every premium reward is fixed and named (no chests, no random card picks). Free-track chests stay, since they are earned, and their odds are shown.

| Tier | Free         | Premium (fixed contents)                                                                              | Replaces (value basis)                               |
| ---- | ------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1    | 200 coins    | 2 Orchid Bee cards (Epic) + season skin frame (cosmetic)                                              | "Epic bee card x2" (random Epic)                     |
| 3    | Wood chest   | 20 gems                                                                                               |                                                      |
| 5    | 5 gems       | 4 Bumble Tank cards (Common) + 2 Mason Bee cards (Rare) + 120 coins                                   | Silver chest (6 cards, 80 to 150 coins)              |
| 8    | Silver chest | 1000 coins                                                                                            |                                                      |
| 10   | 500 coins    | Season bee skin (cosmetic)                                                                            |                                                      |
| 12   | Rare card x5 | 6 Dart Bee cards (Common) + 4 Sweat Bee cards (Rare) + 2 Leafcutter cards (Epic) + 300 coins          | Gold chest (12 cards, 200 to 400 coins)              |
| 15   | 10 gems      | 40 gems                                                                                               |                                                      |
| 18   | Silver chest | 5 Leafcutter cards (Epic)                                                                             | "Epic cards x5" (random Epics)                       |
| 20   | 800 coins    | 10 Bumble Tank cards (Common) + 6 Carpenter Bee cards (Rare) + 4 Honey Guard cards (Epic) + 500 coins | Royal chest (20 cards, 500 coins, 1 Epic guaranteed) |
| 23   | Gold chest   | 50 gems                                                                                               |                                                      |
| 25   | 15 gems      | 3 Frost Wing cards (Legendary)                                                                        | "Legendary card x3" (random Legendaries)             |
| 28   | Gold chest   | Hive decoration (cosmetic)                                                                            |                                                      |
| 30   | Royal chest  | Animated season cannon skin + 100 gems                                                                |                                                      |

- Other tiers: free 150 coins, premium 300 coins.
- After tier 30: bonus reward every 600 XP (max 10). Free track: Silver chest (earned, odds shown). Premium track: 150 coins + 15 gems (fixed).
- Named bees for tiers 1, 18, 20 and 25 may rotate per season (remote config `season.premiumBees`), but each season's list is fixed and shown on the pass screen before purchase.
- Power cap: premium card rewards total **48 cards across 6 tiers: 21 Common, 11 Rare, 13 Epic, 3 Legendary** (tier 1: 2E; tier 5: 4C + 2R; tier 12: 6C + 4R + 2E; tier 18: 5E; tier 20: 10C + 6R + 4E; tier 25: 3L). Cap: premium cards at most 15% of season card intake.
- Season card intake (free, ad-watcher, 28 days) is about 1,000 cards, not 280. The 280 figure counted only one chest per day. At about 4.2 wins/day (one chest each, short Wood/Silver timers, ad halvings), chests give about 18 cards/day. Daily Wood + daily-bonus Wood add 6/day, streak and weekly chests add about 6.5/day, and the free pass track adds about 64/season. Total about 33/day, or about 920 to 1,000 per 28 days. M5-2a measures 1,160 in 30 days (about 1,080 per 28 days), which agrees.
- Premium share = 48 / (about 1,000 + 48) = **4.6%** (sim: 48 / 1,160 = 4.1%), well under 15%. Epic-only share: 13 premium Epics vs about 60 Epics from chests per season, about 18%. Watch this in playtests, but it is not capped.

## Rotating events

Run 1 event at a time, 3 to 5 days, 1 to 2 day gap. Points from playing event levels; milestone rewards (no ranking in v1).

| Event        | Duration | Rule twist                                | Points                      | Milestones (pts: reward)                               |
| ------------ | -------- | ----------------------------------------- | --------------------------- | ------------------------------------------------------ |
| Pollen Rush  | 3 d      | all gates +1 value, waves +30%            | win 100, per 10% nest dmg 5 | 300: 200 coins, 800: Silver, 1500: 25 gems, 2500: Gold |
| Hornet Hunt  | 4 d      | hornet share 50%                          | per hornet 2                | 200: Rare x5, 600: Silver, 1200: Epic x3, 2000: Gold   |
| Queen's Ball | 3 d      | queen charge 50% faster                   | per queen 15, win 50        | 300: 200 coins, 900: 20 gems, 1800: Gold               |
| Night Bloom  | 5 d      | dark lane, gates glow only within 6 units | win 120                     | 400: Silver, 1200: event skin, 2400: Royal             |
| Boss Swarm   | 4 d      | boss level each run, scaling tier         | win 200 x tier              | 400: Gold, 1200: 40 gems, 2400: Legendary x2           |

## 28-day live-ops calendar (season template)

| Days     | Event                             | Other                                           |
| -------- | --------------------------------- | ----------------------------------------------- |
| 1 to 3   | Pollen Rush                       | season start, new season bee                    |
| 5 to 8   | Hornet Hunt                       |                                                 |
| 10 to 12 | Queen's Ball                      | mid-week 2x chest speed weekend (days 13 to 14) |
| 15 to 19 | Night Bloom                       |                                                 |
| 21 to 24 | Boss Swarm                        |                                                 |
| 26 to 28 | Pollen Rush (finale, 1.5x points) | last-chance pass reminder day 27                |

## Remote config shape

```json
{
  "season": {
    "id": "s1-bloom",
    "start": "2026-11-02T00:00:00Z",
    "days": 28,
    "xpPerTier": 300,
    "tiers": "see table"
  },
  "events": [
    {
      "id": "pollen-rush",
      "start": "2026-11-02T00:00:00Z",
      "end": "2026-11-05T00:00:00Z",
      "mods": { "gateAdd": 1, "waveMul": 1.3 },
      "milestones": [
        [300, "coins:200"],
        [800, "chest:silver"]
      ]
    }
  ],
  "dailyPool": "see table",
  "weeklyPool": "see table",
  "streak": { "freezesPerWeek": 1 }
}
```

Clock tests: day rollover, week rollover, timezone offsets, device clock set forward (server time wins), event boundary at 23:59:59.
