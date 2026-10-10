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
  | Tier | Free | Premium |
  | --- | --- | --- |
  | 1 | 200 coins | Epic bee card x2 + season skin frame |
  | 3 | Wood chest | 20 gems |
  | 5 | 5 gems | Silver chest |
  | 8 | Silver chest | 1000 coins |
  | 10 | 500 coins | Season bee skin (cosmetic) |
  | 12 | Rare card x5 | Gold chest |
  | 15 | 10 gems | 40 gems |
  | 18 | Silver chest | Epic cards x5 |
  | 20 | 800 coins | Royal chest |
  | 23 | Gold chest | 50 gems |
  | 25 | 15 gems | Legendary card x3 |
  | 28 | Gold chest | Hive decoration (cosmetic) |
  | 30 | Royal chest | Animated season cannon skin + 100 gems |
  Other tiers: free 150 coins, premium 300 coins. After tier 30: bonus Silver chest every 600 XP (max 10). Power rewards on premium stay under 15% of season card total so free players are not walled.

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
