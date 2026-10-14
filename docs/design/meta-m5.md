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
- Balance rule: a full max loadout must not lift aim-bot win rate on a level more than 25 points.
- **Enemy scaling is easier-only (catch-up help).** Stage difficulty comes only from the stage curve (levels-m2 bands and generator formulas). Loadout power never makes enemies harder, so upgrading or spending always pays off. Below expectedP, the generator scales enemy hp total E by `clamp(1 + 0.01 x (P - expectedP(n)), 0.95, 1.00)`. At or above expectedP the scale is exactly 1.00; the most it eases is 5%. The cap is 5%, not 10%: in the M5-2a sim (win-sens 2.0), 10% easing let no-ads players clear about 25 more stages by day 30 than ad-watchers (159 vs 132), so catch-up overshot and became a reward for not progressing. Catch-up must only narrow the gap, never reverse it.
- **Loss-streak assist (optional, stacks with the above):** after 2 consecutive losses on the same stage, E x 0.95. After 3 or more, E x 0.90. The combined floor is 0.85 (at most 15% easier, only while stuck). It applies to every stage, including handmade L2 to L5 (wave counts, trickle rate, boss burst and repeat counts; the Matriarch is not scaled), while catch-up easing stays generator-only (n >= 6). It resets on a win or a stage change, is shown as a small "Wind at your back" leaf icon, and is never sold or affected by purchases. Remote config `difficulty.lossAssist = [[2, 0.95], [3, 0.90]]`, `difficulty.scaleFloor = 0.85`.

### expectedP(n): expected player power at stage n

**Level pace (what n is).** n is the **stage number**: the highest campaign stage the player has cleared. A win on the current stage advances n by 1, and a loss does not. There is no separate "player level" in difficulty math. Account XP (`playerLevel`/`xp` in the save) drives only cosmetic rank and the hive room cap, never enemy scaling. Loadout slot unlocks (slots 1 to 4 at stages 3, 5, 8, 12) also use n. Pace for the baseline (6 battles/day, about 70% win plus revives): about 4.2 stages/day, so stage 125 to 128 at day 30 (M5-2a rerun 4db39df; the older 4c33a8e run showed about 5/day).

Baseline player: **free (no purchases), watches rewarded ads** at the M5-5 caps (3 chest-time halvings/day plus daily pack), plays 6 battles/day, opens the free daily Wood chest, completes dailies, free season track only. Payers sit above the baseline and get no extra difficulty. No-ads free players sit below it and get up to 5% catch-up easing.

P = sum over equipped bees of (bee level x rarityWeight), with weights C1 R2 E3 L4. Worker is excluded.

Refit (M5-1b) to the M5-2a rerun median of the ad-watching free player (branch `monetization/m5-2a-rerun` @ `4db39df`, design_ref `126a7bc`: per-chest pity, boss Gold chest, hive rooms, win-sens 1.3). The planned ~10% cut is **cancelled**: with the boss Gold chest and rooms in the sim, the medians vs the old table were no-ads 94%, ad-watcher 100%, payer 103%, with no hard wall by day 30 (stages 125 to 128, about 4.2 stages/day). The early points (n 3 to 36) are raised to match the ad-watcher median; the later points barely move.

| Stage n | Approx. day | expectedP(n) | Old value (209606b) | Note                                                  |
| ------- | ----------- | ------------ | ------------------- | ----------------------------------------------------- |
| 1 to 2  | 1           | 0            | 0                   |                                                       |
| 3       | 1           | 5            | 2                   |                                                       |
| 5       | 1           | 7            | 5                   |                                                       |
| 10      | 3           | 18           | 13                  |                                                       |
| 14      | 4           | 24           | 21                  |                                                       |
| 25      | 6           | 34           | 30                  |                                                       |
| 36      | 9           | 42           | 39                  |                                                       |
| 52      | 13          | 46           | 46                  |                                                       |
| 74      | 18          | 54           | 54                  |                                                       |
| 111     | 27          | 61           | 63                  |                                                       |
| 160     | 38          | 71           | 71                  | unverified: not reached in the 30-day sim, kept as is |

Formula: piecewise-linear interpolation between the rows above. Beyond n = 160: `expectedP(n) = 71 + 0.17 x (n - 160)`, capped at 112 (4 Legendaries at L7).
Config: ship as remote config `difficulty.expectedP` (array of [n, P] points).

**Check against the sim (M5-2a rerun 4db39df, old table):** median P/expectedP no-ads 94%, ad-watcher 100%, payer 103%; no-ads minimum 89%, no level stall. Order payer >= ads >= no-ads holds. MON to confirm on this refit.

**Sim note for MON (M5-2a model gap):** `economy_sim.py` makes win rate depend only on enemy scale, so loadout power has no direct effect on winning. Under that model, any easing makes weaker players faster and payer >= ads >= no-ads can only hold with zero easing. In the game, more power does win more (stronger bees, faster queen). Proposal: add a direct term, win rate + k x (P / expectedP - 1) with k about 0.3 to 0.5, and calibrate k from playtests (M2-12) or the M2-5 bots.

**85% reconciliation:** the old sim's 85% figure models the no-ads free player. Under this definition the no-ads player is about 85% and the ad-watching player is 100%, so the definitions now agree.

## Chests

4 chest slots. Every win grants 1 chest if a slot is free (losses with >= 60% nest damage grant a Wood chest at 25% chance). Unlock one at a time. **The first win chest after the FTUE unlocks instantly** (M5-1 validation: otherwise a new player reaches the stage-3 "Equip!" prompt before any win chest has opened).

| Chest                                                                                                                                   | Source                    | Unlock time | Gem skip | Cards | Coins      | Odds per card (C/R/E/L)        |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------- | -------- | ----- | ---------- | ------------------------------ |
| Wood                                                                                                                                    | 70% of wins               | 15 min      | 3        | 3     | 30 to 60   | 80/18/2/0                      |
| Silver                                                                                                                                  | 25% of wins               | 1 h         | 8        | 6     | 80 to 150  | 70/24/5.5/0.5                  |
| Gold                                                                                                                                    | 5% of wins, boss wins     | 4 h         | 20       | 12    | 200 to 400 | 60/28/10/2                     |
| Royal                                                                                                                                   | season pass, 7-day streak | 8 h         | 35       | 20    | 500        | 50/30/15/5 + 1 guaranteed Epic |
| Gem skip rate: 1 gem per 5 min remaining, rounded up (table shows full price). Rewarded ad halves remaining time, max 3 per day (M5-5). |

- Pity: Legendary guaranteed by 40th **chest** opened without one (counted per chest, not per card); counter visible in chest info. Note (M5-1 validation, `validation-m5.md`): the M5-2a sim counts pity per card and has no boss Gold chest, The M5-2a rerun (4db39df) did this and the expected ~10% cut did not happen; see the expectedP refit below (M5-1b).
- New bee drop protection: first Epic and Legendary are always a bee the player does not own.
- Odds displayed on every chest tap (icon "i"), in-store, and on purchase screens. Free daily chest at the hive: Wood, every 24 h.

## Hive base

Simple screen with 4 rooms, each upgrades with coins and a build timer (one build at a time; second builder via gems).

| Room                                                                                                    | Effect per level                   | Max | L1 cost / time | L5 cost / time |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------- | --- | -------------- | -------------- |
| Honey Store                                                                                             | idle coins 20/h per level, cap 8 h | 10  | 200 / 5 min    | 4000 / 6 h     |
| Brood Cell                                                                                              | queen charge -0.2 s per level      | 5   | 500 / 30 min   | 8000 / 12 h    |
| Wax Walls                                                                                               | hive hp +3 per level               | 10  | 300 / 10 min   | 5000 / 8 h     |
| Pollen Lab                                                                                              | +1 card per chest every 2 levels   | 6   | 800 / 1 h      | 12000 / 24 h   |
| Room level cap = floor(player level / 2). Account XP curve: see "Account XP and level rewards (M5-1b)". |

## Account XP and level rewards (M5-1b)

### (a) Account XP curve

XP sources (same events as season pass XP, counted once into both): win 30, loss 10, each daily target 20, daily bonus 50, each weekly target 100. Baseline player (6 battles/day at about 4.2 stages/day, all 3 dailies, 3 of 5 weeklies) earns about 295 XP/day plus about 300 XP/week, so about **330 XP/day** on average.

Formula: XP to go from level L to L+1 = `150 + 20 x L`. Total XP to reach level L = `170 x (L - 1) + 10 x (L - 1) x (L - 2)`. No level cap.

| Level | XP to next | Total XP to reach | Approx. day (330 XP/day) |
| ----- | ---------- | ----------------- | ------------------------ |
| 1     | 170        | 0                 | 0.0                      |
| 2     | 190        | 170               | 0.5                      |
| 3     | 210        | 360               | 1.1                      |
| 5     | 250        | 800               | 2.4                      |
| 7     | 290        | 1320              | 4.0                      |
| 10    | 350        | 2250              | 6.8                      |
| 12    | 390        | 2970              | 9.0                      |
| 15    | 450        | 4200              | 12.7                     |
| 20    | 550        | 6650              | 20.2                     |
| 25    | 650        | 9600              | 29.1                     |
| 30    | 750        | 13050             | 39.5                     |

Why: two anchors fix both constants. Level 10 needs 2,250 XP (day 6.8) and level 25 needs 9,600 XP (day 29), which matches the targets of about 10 by day 7 and about 25 by day 30. The linear step keeps early levels quick (first level after about 2 wins plus dailies) and slows later levels only gently. Room cap = floor(level / 2) gives cap 5 on day 7 and cap 10 by about day 20, so rooms are never capped by level for long. Note for MON: the rerun used `100 x L`, which gave only level 13 at day 30; switch to this curve.

### (b) Gems for levels %10

Each account level that is a multiple of 10 (10, 20, 30, ...) grants **25 Nectar Gems** (5 gem revives).

Why: a free player hits level 10 on about day 7 and level 20 on about day 20, so this adds 50 gems in the first month (about 1.7 gems/day). The M5-2a rerun showed revive coverage at 5 gems of 100% with weekly gems (35/week) and 55 to 59% without them; 25 gems per milestone tops up a player who misses weeklies by about 10 revives a month without making gems feel common next to weekly (140/month) and pass income.

### (c) Wax Walls and Brood Cell as sim inputs

The sim win term is `win + k x (P_eff / expectedP(n) - 1)` with k = 0.5. Rooms add to P_eff for this term only. They do **not** count toward P in the catch-up clamp or in expectedP (both stay bee-only, so the refit above is unchanged).

| Room       | Effect per level    | Power-equivalent per level | Max level | Max P_eff bonus |
| ---------- | ------------------- | -------------------------- | --------- | --------------- |
| Wax Walls  | hive hp +3          | +1.0 P                     | 10        | +10             |
| Brood Cell | queen charge -0.2 s | +1.5 P                     | 5         | +7.5            |

Why Wax Walls +1.0: Mason Bee prices hive hp at about 1 hp per P (+2 hp per level for 2 P as a Rare). Extra hive hp only helps in runs that would end by hive death, so a room level is worth about one third of bee parity: 3 hp to 1 P. Base hive hp is 50, so 10 levels add 60% hp.

Why Brood Cell +1.5: base queen charge is 6 to 7 s, so -0.2 s is about 3% faster. Orchid Bee prices charge at 2% per 3 P (Epic), which is about 4.5 P for 3%. Using the same one-third discount (charge only matters in close runs) gives 1.5 P.

Check: a day-30 player with Wax Walls 5 and Brood Cell 5 (rerun levels) gets +12.5 P against expectedP of about 61, which is +10% win rate at k = 0.5. This is a visible but not dominant reason to build rooms, and it applies to all segments equally, so it does not change the order of payer, ads and no-ads players.

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
