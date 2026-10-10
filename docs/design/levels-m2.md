# Levels M2 (M2-4): levels 1 to 10, difficulty curve, generator rules

Owner: DES. Implements in M2-5 (handmade) and M7-1 (generator). Uses existing `LevelDef` fields; two proposed additions are marked NEW.

## Baseline math (from src/sim)

- Fire rate: 1 / 0.11 = 9.1 workers/s. Worker hp 1, speed 7. Wasp hp 1, speed 4.5. Hornet hp 8, speed 3. Queen hp 25, speed 4.2.
- "Effective multiplier" M = product of gates a good aimer reliably takes (add gates converted at their value / 1 per bee, approx).
- Nest damage budget: nestHp should equal about 0.55 x (fire seconds x 9.1 x M) minus bees spent on enemies, so a skilled player wins with 15 to 30 s left and idle always loses.
- Idle loses rule: total enemy hp reaching the hive > hiveHp within timeLimit. Every level must have waves summing to at least 3 x hiveHp.

## Difficulty curve (levels 1 to 10)

Target win rate is first-attempt for a new player; tune via M2-5 bots and later analytics.

| #   | id               | Type                | Lane L | Time | Nest HP         | Hive HP | Queen charge | Gates (best path M)                            | Enemy hp total | Hornets   | Target 1st-try win |
| --- | ---------------- | ------------------- | ------ | ---- | --------------- | ------- | ------------ | ---------------------------------------------- | -------------- | --------- | ------------------ |
| 1   | ftue-meadow      | FTUE                | 32     | 75   | 600             | 60      | 4            | x2, +3 moving (M about 2.5)                    | 20             | 0         | 98%                |
| 2   | dandelion-drift  | handmade            | 36     | 80   | 1200            | 50      | 6            | x2 / +2, x2 moving (M 4)                       | 140            | 0         | 92%                |
| 3   | clover-run       | handmade (existing) | 40     | 90   | 2600            | 40      | 7            | x2, x3 moving, x2 vs -25 (M 12)                | 401            | 14        | 80%                |
| 4   | thistle-gauntlet | handmade            | 42     | 90   | 3400            | 40      | 7            | +5 wide vs x3 narrow, -40 trap, x2 (M 6 to 12) | 520            | 18        | 70%                |
| 5   | wasp-queen-nest  | boss                | 44     | 110  | 6000 (3 phases) | 45      | 6            | see boss table (M 12 to 18)                    | 760            | 30 + boss | 55%                |
| 6   | gen band A       | generated           | 40     | 90   | 3000            | 45      | 7            | 4 gates                                        | 450            | 10        | 85% (breather)     |
| 7   | gen band B       | generated           | 42     | 90   | 3800            | 40      | 7            | 5 gates                                        | 600            | 18        | 72%                |
| 8   | gen band B       | generated           | 42     | 95   | 4200            | 40      | 7            | 5 gates                                        | 680            | 22        | 68%                |
| 9   | gen band C       | generated           | 44     | 95   | 4800            | 38      | 7.5          | 6 gates                                        | 780            | 28        | 60%                |
| 10  | gen boss         | generated boss      | 44     | 110  | 7000            | 40      | 6.5          | 6 gates                                        | 900            | 36 + boss | 50%                |

Shape: rise 1 to 5, breather at 6, rise 7 to 10, repeat every 5 levels (saw-tooth). Boss every 5th level.

## Handmade layouts

Coordinates: x in [-5, 5], y from hive (0) to nest (L). Waves `at` in seconds.

### L2 dandelion-drift (teach choice)

```json
{
  "id": "dandelion-drift",
  "seed": 201,
  "laneWidth": 10,
  "laneLength": 36,
  "timeLimit": 80,
  "nestHp": 1200,
  "hiveHp": 50,
  "fireInterval": 0.11,
  "queenCharge": 6,
  "trickleInterval": 0,
  "gates": [
    { "kind": "mul", "value": 2, "x": -2.5, "y": 9, "width": 3.2 },
    { "kind": "add", "value": 2, "x": 2.5, "y": 9, "width": 3.4 },
    {
      "kind": "mul",
      "value": 2,
      "x": 0,
      "y": 18,
      "width": 3.0,
      "motion": { "amplitude": 2.5, "speed": 0.8 }
    }
  ],
  "waves": [
    { "at": 5, "kind": "wasp", "count": 15, "x": 0, "spread": 3 },
    { "at": 15, "kind": "wasp", "count": 25, "x": -2, "spread": 3 },
    { "at": 28, "kind": "wasp", "count": 40, "x": 2, "spread": 3.5 },
    { "at": 45, "kind": "wasp", "count": 60, "x": 0, "spread": 4 }
  ]
}
```

### L3 clover-run

Keep as shipped in `src/sim/levels.ts` (no changes). Introduces hornets and the first trap.

### L4 thistle-gauntlet (risk vs safety)

```json
{
  "id": "thistle-gauntlet",
  "seed": 401,
  "laneWidth": 10,
  "laneLength": 42,
  "timeLimit": 90,
  "nestHp": 3400,
  "hiveHp": 40,
  "fireInterval": 0.11,
  "queenCharge": 7,
  "trickleInterval": 0.8,
  "gates": [
    { "kind": "add", "value": 5, "x": -2.2, "y": 8, "width": 4.2 },
    { "kind": "mul", "value": 3, "x": 2.8, "y": 8, "width": 2.2 },
    { "kind": "sub", "value": 40, "x": 0, "y": 16, "width": 4.0 },
    { "kind": "mul", "value": 2, "x": -3, "y": 16, "width": 2.4 },
    {
      "kind": "mul",
      "value": 2,
      "x": 0,
      "y": 27,
      "width": 2.8,
      "motion": { "amplitude": 3.5, "speed": 1.1 }
    }
  ],
  "waves": [
    { "at": 4, "kind": "wasp", "count": 20, "x": 0, "spread": 3 },
    { "at": 14, "kind": "hornet", "count": 4, "x": -2, "spread": 2 },
    { "at": 24, "kind": "wasp", "count": 45, "x": 2, "spread": 3.5 },
    { "at": 38, "kind": "hornet", "count": 6, "x": 0, "spread": 3 },
    { "at": 50, "kind": "wasp", "count": 70, "x": -1, "spread": 4 },
    { "at": 66, "kind": "hornet", "count": 8, "x": 1, "spread": 3.5 },
    { "at": 76, "kind": "wasp", "count": 90, "x": 0, "spread": 4.5 }
  ]
}
```

### L5 wasp-queen-nest (boss)

NEW fields: `boss` block. Nest has 3 phases at 100/66/33% HP. Each phase transition spawns a burst and changes gates.

| Phase                                                                                                                                        | Nest HP slice | On enter                                                                                   | Gate change                                                          | Wave cadence                              |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| 1                                                                                                                                            | 6000 to 4000  | none                                                                                       | x2 (-2,10,w3), +3 (2.5,10,w3.4), x3 moving (0,20,w2.4,amp 3,spd 1.0) | wasps 25 every 10 s                       |
| 2                                                                                                                                            | 4000 to 2000  | burst: 8 hornets                                                                           | add -30 trap at (0,30,w4)                                            | wasps 35 every 9 s + 3 hornets every 15 s |
| 3                                                                                                                                            | 2000 to 0     | burst: 60 wasps + Wasp Matriarch (hp 120, speed 1.5, radius 1.0, kills 3 bees per contact) | x3 gate speed 1.0 to 1.4                                             | wasps 45 every 8 s                        |
| Boss config: `{ "timeLimit":110,"hiveHp":45,"queenCharge":6,"trickleInterval":0.7 }`. Win rate target 55%; revive available (existing rule). |

## Templated level generator (M7-1)

Input: `levelIndex n` (>= 6), `seed = hash("hs", n)`. Band = position in 5-level cycle: `c = (n - 1) % 5` maps to [A breather, B, B, C, Boss]. Tier `t = floor((n - 1) / 5)` (L6 to 10 is t=1).

### Scalars

| Param           | Formula                                                                               | Clamp    |
| --------------- | ------------------------------------------------------------------------------------- | -------- |
| laneLength      | 40 + 2 x min(c, 2)                                                                    | 40 to 46 |
| timeLimit       | 90 (A/B), 95 (C), 110 (Boss)                                                          |          |
| hiveHp          | 45 A, 40 B, 38 C, 40 Boss                                                             | min 30   |
| queenCharge     | 7 + 0.5 x (c==3) ; Boss 6.5                                                           | 6 to 8   |
| trickleInterval | max(0.5, 0.9 - 0.05 x t)                                                              |          |
| enemyHpTotal E  | 450 x (1 + 0.18 x t) x bandMul; bandMul A 1.0, B 1.4, C 1.75, Boss 2.0                |          |
| hornetShare     | min(0.45, 0.20 + 0.04 x t) of E (hornet = 8 hp)                                       |          |
| nestHp          | round50(E x 6.5 x bandMul2); bandMul2 A 1.0, B 0.85, C 0.9, Boss 1.15 (+ boss phases) |          |

### Gates

- Count: A 4, B 5, C 6, Boss 6. Placed in rows at y = 8, 16, 25, 33 (rows beyond laneLength - 6 dropped). Max 2 gates per row, min 0.6 gap between edges.
- Each row offers a choice: one "safe" gate (wider) and one "greedy" gate (narrower, moving, or next to a trap).

| Gate         | Value pool                        | Width      | Motion                                                      |
| ------------ | --------------------------------- | ---------- | ----------------------------------------------------------- |
| add (safe)   | +2, +3, +5 (+8 at t >= 3)         | 3.4 to 4.2 | none (A/B), 30% chance amp 1.5 spd 0.6 (C)                  |
| mul (greedy) | x2 (70%), x3 (30%; 45% at t >= 2) | 2.2 to 3.0 | 50% chance: amp 2 to 3.5, spd 0.7 to 1.0 + 0.1 x t, max 1.5 |
| sub (trap)   | 15 + 10 x t, max 60               | 3.0 to 4.0 | none                                                        |

- Constraints: at most one x3 per row; best-path product M in [6, 18]; at least one row where the greedy path has a trap within 1.0 x of it (from row 2); never two moving gates in the same row.

### Waves

- Wave count: 6 (A), 7 (B), 8 (C), boss uses phase table scaled by `E / 760`.
- First wave at 4 s with 15 to 20 wasps. Then waves every `(timeLimit - 15) / waveCount` s, sizes ramp linearly so the last wave holds 22% of E.
- Hornet waves interleave every third wave. x in [-2.5, 2.5], spread 2 to 4.5. No wave in final 10 s.

### Validator (must pass, else reseed up to 20 times)

1. Idle bot (never fires) loses before timeLimit.
2. Centre bot (fires straight, aimX 0, queen when ready) loses or wins with under 10 s left in A/B; loses in C/Boss.
3. Aim bot (targets best gate with lead, queen when ready) wins with 10 to 40 s left.
4. Peak bees under BEE_CAP 600 and wasps under WASP_CAP 400 for the full run.
5. Difficulty score `D = E / (nestTimeLeftAimBot + 1)` within plus or minus 20% of band target.
   Generated levels are named from a word list (Meadow, Bramble, Honeysuckle, Foxglove, Lavender, Sunpatch, Mossbank, Rosehip, Bluebell, Heather) + suffix (Run, Drift, Gauntlet, Hollow, Crossing).

## Acceptance check

Layouts, gates and target win rate per level: given for 4 handmade (L1 FTUE, L2, L3, L4) + 1 boss (L5), plus L6 to 10 via generator.
