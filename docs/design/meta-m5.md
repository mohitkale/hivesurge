# Meta design (M5-1): collectible bees, chests, cards + loadout, hive base

Owner: DES. Implements in M5-4. Economy numbers are provisional until MON validates in M5-2. Odds always shown; paid random items disabled in regions flagged by M5-3.

## Core loop

Battle (60 to 110 s) -> coins + chest key progress -> open chest -> bee cards -> upgrade bees (coins) -> equip 4-slot loadout -> stronger battle. Hive base timers give a reason to return every 4 to 8 h.

## Currencies

| Currency       | Earn                                                              | Spend                                       | Cap     |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------- | ------- |
| Coins          | battles (existing rewards.ts: 50 to 125 per win), chests, targets | bee upgrades, hive rooms                    | none    |
| Nectar Gems    | targets, season pass, levels %10, test-mode IAP                   | chest speed-up, extra chest slot, cosmetics | none    |
| Pollen (cards) | chests                                                            | bee level-ups (with coins)                  | per bee |

## Collectible bees (launch roster 12)

Each bee is a loadout card that modifies the cannon or spawns. Rarity sets drop weight and max level.

| id          | Name              | Rarity    | Effect (level 1 / per level)                      |
| ----------- | ----------------- | --------- | ------------------------------------------------- |
| worker      | Worker Bee        | Common    | baseline worker; +2% fire rate per level          |
| bumble      | Bumble Tank       | Common    | every 10th shot is a 3 hp bee; +1 hp per 3 levels |
| dart        | Dart Bee          | Common    | +10% worker speed; +2%/lvl                        |
| carpenter   | Carpenter Bee     | Rare      | traps absorb 20% fewer bees; +3%/lvl              |
| mason       | Mason Bee         | Rare      | hive +10 hp; +2/lvl                               |
| sweat       | Sweat Bee         | Rare      | x gates +1 extra bee per pass chance 10%; +2%/lvl |
| orchid      | Orchid Bee        | Epic      | queen charges 15% faster; +2%/lvl                 |
| leafcutter  | Leafcutter        | Epic      | gates you pass glow and stay +1 value for 5 s     |
| honeyguard  | Honey Guard       | Epic      | once per battle, shield blocks 15 wasps at hive   |
| royal-jelly | Royal Jelly Queen | Legendary | queen hp 25 to 40, splits into 6 workers on death |
| sunburst    | Sunburst Drone    | Legendary | every 20 s fires a 12-bee volley at cannon x      |
| frost-wing  | Frost Wing        | Legendary | queen launch slows wasps 40% for 3 s              |

### Levels and costs

| Level                                                                                                               | Pollen needed (C/R/E/L) | Coins | Power gain |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----- | ---------- |
| 1 to 2                                                                                                              | 2/2/1/1                 | 50    | as table   |
| 2 to 3                                                                                                              | 4/3/2/1                 | 150   |            |
| 3 to 4                                                                                                              | 10/6/4/2                | 400   |            |
| 4 to 5                                                                                                              | 20/12/8/4               | 1000  |            |
| 5 to 6                                                                                                              | 40/25/15/8              | 2000  |            |
| 6 to 7 (max C/R)                                                                                                    | 80/50/30/15             | 4000  |            |
| Max level: Common 10, Rare 9, Epic 8, Legendary 7. Overflow pollen converts to coins (C 5, R 15, E 50, L 200 each). |

## Loadout (4 slots)

- Slot 1 unlocks at stage 3, slot 2 at 5, slot 3 at 8, slot 4 at 12 (stage = n, see expectedP). Worker is always the base shooter and does not take a slot.
- One copy of each bee. Total power `P = sum(bee level x rarityWeight)` with weights C1 R2 E3 L4 is shown on screen and used by matchmaking for events.
- Balance rule: a full max loadout must not lift aim-bot win rate on a level more than 25 points; generator scales E by `clamp(1 + 0.03 x (P - expectedP(n)), 0.90, 1.15)` (at most plus 15% harder, at most 10% easier). See expectedP below.

### expectedP(n): expected player power at stage n

**Level pace (what n is).** n is the **stage number**: the highest campaign stage the player has cleared. A win on the current stage advances n by 1, and a loss does not. There is no separate "player level" in difficulty math. Account XP (`playerLevel`/`xp` in the save) drives only cosmetic rank and the hive room cap, never enemy scaling. Loadout slot unlocks (slots 1 to 4 at stages 3, 5, 8, 12) also use n. Pace for the baseline (6 battles/day, about 70% win plus revives): about 5 stages/day, so stage 159 at day 30 (M5-2a run 4c33a8e).

Baseline player: **free (no purchases), watches rewarded ads** at the M5-5 caps (3 chest-time halvings/day plus daily pack), plays 6 battles/day, opens the free daily Wood chest, completes dailies, free season track only. Payers sit above the baseline (limited by the plus 15% cap). No-ads free players sit below it (softened by the minus 10% floor).

P = sum over equipped bees of (bee level x rarityWeight), with weights C1 R2 E3 L4. Worker is excluded.

Retuned to the M5-2a median of the ad-watching free player (sim `last_run.md`, design_ref 209606b: median P = ratio x old expectedP):

| Stage n | Approx. day | expectedP(n) | Old value | Sim ads-player P |
| ------- | ----------- | ------------ | --------- | ---------------- |
| 1 to 2  | 1           | 0            | 0         | 0                |
| 3       | 1           | 2            | 2         | n/a              |
| 5       | 1           | 5            | 6         | 5.3              |
| 10      | 2           | 13           | 15        | 13.4             |
| 14      | 3           | 21           | 26        | 21.1             |
| 25      | 5           | 30           | 43        | 30.1             |
| 36      | 7           | 39           | 57        | 39.0             |
| 52      | 10          | 46           | 74        | 46.0             |
| 74      | 14          | 54           | 98        | 54.1             |
| 111     | 21          | 63           | 112       | 62.7             |
| 160     | 30          | 71           | 112       | 70.6             |

Formula: piecewise-linear interpolation between the rows above. Beyond n = 160: `expectedP(n) = 71 + 0.17 x (n - 160)`, capped at 112 (4 Legendaries at L7).
Config: ship as remote config `difficulty.expectedP` (array of [n, P] points).

**Check against the sim (no-ads player, estimated from the same run):** P/expectedP comes out about 75% (day 5), 87% (day 7), 82% (day 10), 86% (day 14), 94% (day 30). The median is about 85%, which meets the target. The ads player is about 100% by construction. MON to confirm with an M5-2a rerun on this commit.

**85% reconciliation:** the old sim's 85% figure models the no-ads free player. Under this definition the no-ads player is about 85% and the ad-watching player is 100%, so the definitions now agree.

## Chests

4 chest slots. Every win grants 1 chest if a slot is free (losses with >= 60% nest damage grant a Wood chest at 25% chance). Unlock one at a time.

| Chest                                                                                                                                   | Source                    | Unlock time | Gem skip | Cards | Coins      | Odds per card (C/R/E/L)        |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------- | -------- | ----- | ---------- | ------------------------------ |
| Wood                                                                                                                                    | 70% of wins               | 15 min      | 3        | 3     | 30 to 60   | 80/18/2/0                      |
| Silver                                                                                                                                  | 25% of wins               | 1 h         | 8        | 6     | 80 to 150  | 70/24/5.5/0.5                  |
| Gold                                                                                                                                    | 5% of wins, boss wins     | 4 h         | 20       | 12    | 200 to 400 | 60/28/10/2                     |
| Royal                                                                                                                                   | season pass, 7-day streak | 8 h         | 35       | 20    | 500        | 50/30/15/5 + 1 guaranteed Epic |
| Gem skip rate: 1 gem per 5 min remaining, rounded up (table shows full price). Rewarded ad halves remaining time, max 3 per day (M5-5). |

- Pity: Legendary guaranteed by 40th chest opened without one; counter visible in chest info.
- New bee drop protection: first Epic and Legendary are always a bee the player does not own.
- Odds displayed on every chest tap (icon "i"), in-store, and on purchase screens. Free daily chest at the hive: Wood, every 24 h.

## Hive base

Simple screen with 4 rooms, each upgrades with coins and a build timer (one build at a time; second builder via gems).

| Room                               | Effect per level                   | Max | L1 cost / time | L5 cost / time |
| ---------------------------------- | ---------------------------------- | --- | -------------- | -------------- |
| Honey Store                        | idle coins 20/h per level, cap 8 h | 10  | 200 / 5 min    | 4000 / 6 h     |
| Brood Cell                         | queen charge -0.2 s per level      | 5   | 500 / 30 min   | 8000 / 12 h    |
| Wax Walls                          | hive hp +3 per level               | 10  | 300 / 10 min   | 5000 / 8 h     |
| Pollen Lab                         | +1 card per chest every 2 levels   | 6   | 800 / 1 h      | 12000 / 24 h   |
| Room level cap = player level / 2. |

## Wireframes (ASCII)

```
HOME                              CHEST OPEN
+--------------------------+      +--------------------------+
| coins 1,240  gems 35  [=]|      |        SILVER CHEST      |
|                          |      |    [card][card][card]    |
|      [  HIVE ART  ]      |      |    [card][card][card]    |
|  Lvl 7 Bramble Crossing  |      |  Rare x2  Common x4      |
|      [   PLAY   ]        |      |  +120 coins              |
| [chest][chest][  ][  ]   |      |  [ COLLECT ]  odds (i)   |
| Home Bees Hive Pass Shop |      +--------------------------+
+--------------------------+
COLLECTION                         LOADOUT
+--------------------------+      +--------------------------+
| Bees 7/12   power 46     |      | [slot1][slot2][slot3][x] |
| [Worker L4][Bumble L3]   |      | drag bee into slot       |
| [Dart L2 ][Mason L2 ^]   |      | Power 46 -> 52 preview   |
| [locked ?][locked ?]     |      | [Orchid L1  Upgrade 150] |
| filter: all/owned/rarity |      |                          |
+--------------------------+      +--------------------------+
```

"^" = upgrade available badge. Locked bees show silhouette and which chest can drop them.

## Flows

1. Win -> result screen -> chest flies to free slot -> Home shows slot with timer -> tap starts unlock -> ready badge -> tap opens -> cards fly into Collection -> upgrade badge on bee -> Loadout.
2. All 4 slots full: result screen shows "Chest slots full" and offers coins x1.5 instead of chest (no lost value).
3. Level 3 first visit Home: highlight Bees tab, one-word prompt "Equip!".

## Save additions (for M4 cloud save)

`bees: Record<id,{level,pollen}>`, `loadout: string[4]`, `chests: {type, unlockAt|null}[4]`, `pityLegendary: number`, `hive: Record<room,{level,buildEndsAt|null}>`, `playerLevel`, `xp`.
