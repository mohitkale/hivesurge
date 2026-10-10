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

- Slot 1 unlocks at level 3, slot 2 at 5, slot 3 at 8, slot 4 at 12. Worker is always the base shooter and does not take a slot.
- One copy of each bee. Total power `P = sum(bee level x rarityWeight)` with weights C1 R2 E3 L4 is shown on screen and used by matchmaking for events.
- Balance rule: a full max loadout must not lift aim-bot win rate on a level more than 25 points; generator scales E by `clamp(1 + 0.03 x (P - expectedP(n)), 0.90, 1.15)` (at most plus 15% harder, at most 10% easier). See expectedP below.

### expectedP(n): expected player power at level n

Baseline player: **free (no purchases), watches rewarded ads** at the caps in M5-5 (3 chest-time halvings/day plus daily pack), plays 6 battles/day at a 70% win rate, opens the free daily Wood chest, completes dailies, and uses only the free season track. A paying player sits above the baseline, which is what the plus 15% cap limits. A free player who skips ads sits below it, which is what the minus 10% floor softens.

P = sum over equipped bees of (bee level x rarityWeight), with weights C1 R2 E3 L4. Worker is excluded.

| Level n | Slots open | expectedP(n) | Typical baseline loadout             |
| ------- | ---------- | ------------ | ------------------------------------ |
| 1 to 2  | 0          | 0            | none                                 |
| 3       | 1          | 2            | Bumble L2                            |
| 5       | 2          | 6            | Bumble L2, Mason (R) L2              |
| 8       | 3          | 12           | Bumble L3, Mason L3, Dart L3         |
| 10      | 3          | 15           | Bumble L4, Mason L4, Dart L3         |
| 12      | 4          | 22           | + Orchid (E) L1, others up one level |
| 15      | 4          | 28           |                                      |
| 20      | 4          | 36           |                                      |
| 30      | 4          | 50           |                                      |
| 50      | 4          | 72           |                                      |

Formula: piecewise-linear interpolation between the rows above. Beyond n = 50: `expectedP(n) = 72 + 1.1 x (n - 50)`, capped at 112 (4 Legendaries at L7).
Config: ship as remote config `difficulty.expectedP` (array of [n, P] points) so MON/DES can retune it after the M5-2a sim.

**Reconciling with the M5-2 sim's 85% assumption.** I could not find the 85% figure written in `monetization/economy.md` or the other monetization docs. I read it as "the free player reaches 85% of the power the curve expects". Under this definition the baseline (free, with ads) is 100% of expectedP by construction. A free player who never watches ads is about 85% (rewarded chest skips are about 15% of their card intake). So **the definitions agree if the sim's 85% models a free no-ads player, and conflict if it models a free player who watches ads**. In that case the sim should use 100%. At 85%, the minus 10% floor makes enemies at most 10% weaker, so that player is never walled. MON should state which player the 85% refers to in the M5-2a re-run.

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
