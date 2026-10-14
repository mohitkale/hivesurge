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
| 1   | ftue-meadow      | FTUE                | 32     | 75   | 600             | 60      | 4            | x2, +3 moving (M about 2.5)                    | 20             | 0         | casual ≥ 95%       |
| 2   | dandelion-drift  | handmade            | 36     | 80   | 1200            | 50      | 6            | x2 / +2, x2 moving (M 4)                       | 140            | 0         | casual ≥ 90%       |
| 3   | clover-run       | handmade (existing) | 40     | 90   | 2600            | 40      | 7            | x2, x3 moving, x2 vs -25 (M 12)                | 401            | 14        | casual 65 to 75%   |
| 4   | thistle-gauntlet | handmade            | 42     | 90   | 3400            | 40      | 7            | +5 wide vs x3 narrow, -40 trap, x2 (M 6 to 12) | 520            | 18        | casual 65 to 75%   |
| 5   | wasp-queen-nest  | boss                | 44     | 110  | 6000 (3 phases) | 45      | 6            | see boss table (M 12 to 18)                    | 760            | 30 + boss | casual 55 ± 5%     |
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

## M2-17 tuning note: Clover Run casual win rate (2026-10-11)

**Which level is which.** The QA playtest called Clover Run "level 1" because it was the only level in the slice. In the campaign (M2-5, branch `feat/m2-5-levels`) the order is:

| Stage | Level           | Role                              | Target                                                |
| ----- | --------------- | --------------------------------- | ----------------------------------------------------- |
| 1     | ftue-meadow     | tutorial, played once             | casual ≥ 95% (98% for any bot that fires); idle loses |
| 2     | dandelion-drift | first real choice                 | casual ≥ 90% (validation-m2.md)                       |
| 3     | clover-run      | first "real" level, used by M2-17 | **casual 65 to 75% (aim 70%)**; idle loses            |

The ≥ 95% target is for ftue-meadow only. The M2-17 70% target is for Clover Run. Until the campaign merges, Clover Run is the slice's level 1, and the same numbers apply.

**Knob changes (only these two):**

| Field  | Old  | New      |
| ------ | ---- | -------- |
| nestHp | 2600 | **2350** |
| hiveHp | 40   | **50**   |

Gates, waves (enemy counts and timings), time limit, queen charge and trickle stay as shipped (waves: wasps 14/22/34/50/70/80 at 4/12/26/44/62/75 s, hornets 3/5/6 at 20/36/56 s).

**Verified with the M2-5 bots** (`tests/bots.ts` at `22e94b0`, run in a scratch copy, seeds `level.seed + s x 7919`):

| Variant                          | Idle (20 seeds) | Centre (200) | Casual (200) | Aim (40) |
| -------------------------------- | --------------- | ------------ | ------------ | -------- |
| shipped (2600 / 40)              | 0%              | 0%           | 41.5%        | 75%      |
| nest 2400 / hive 40              | 0%              | 0%           | 65%          | 80%      |
| nest 2300 / hive 50              | 0%              | 0%           | 73%          | 100%     |
| **nest 2350 / hive 50 (chosen)** | **0%**          | **0%**       | **69%**      | **100%** |
| nest 2000 / hive 50              | 0%              | 0%           | 97.5%        | 100%     |

Shipped casual 41.5% matches QA's 1 win in 4. Nest HP is very sensitive (about 6 to 7 win-rate points per 100 HP), so do not move it more than plus or minus 50 without rerunning the bots.

**Casual bot definition** (for M2-18 to add to `tests/bots.ts`): every 1.5 s it picks a target. It takes the best visible non-trap gate (mul scores 3x its value), but 35% of the time picks a random non-trap gate. It aims at the gate's current x with no lead, plus noise (sum of 3 uniforms, about sd 1.2 lane units). It lifts its finger (no fire) 15% of the time. It launches the queen 1 s after it is ready. It uses its own RNG seeded from the run seed.

**Centre bot stays at 0%, on purpose.** The plan's "casual/centre about 70%" would mean aiming does not matter, and that breaks the existing test "aiming beats firing straight". Decision: the 65 to 75% band applies to the casual bot. The centre bot must stay below casual (it is currently 0%). BA: please read M2-18's acceptance as "casual bot 65 to 75%, idle loses, centre below casual".

## M2-28: aiming pillar (2026-10-14)

M2-12 (PR 052, re-run after M2-26 in research PR 059) found the M2-12 sweeper (holds fire, aims `0.35 × laneWidth × sin(1.3 t)`, queen when ready; `sweepBot(0.35, 1.3)` in `playtests/m2-12/sim-sessions.ts`) wins 100% on L1 to L5, so aiming adds nothing over wiggling.

**Why it wins:** bees fly straight, so a sweeper's payoff is the average gate value over where its stream lands, and a sine sweep spends most of its time at the turn points (x ±3.5) and little at the centre. The old layouts put good gates at x ±2.4 to 2.8 (where the sweeper dwells) and moving gates with amplitude 3 to 3.5 that cross the whole sweep.

**Fix (same recipe on L2 to L5):**

1. **Edge traps on the sweep line:** two `sub 600` gates at x ±3.8, width 2.4 (span |x| ≥ 2.6), at y 4 to 5, before any multiplier. A ±3.5 sweeper puts about 47% of its bees there; a player aiming at the gate column (x 1.3) loses about 5 to 10% to aim noise. 600 lasts the whole battle.
2. **One gate column off the sweep peaks and off the centre:** best gates stacked at **x 1.3** (span about 0.2 to 2.4). A centre-only player misses it (centre bot stays below casual), the sweeper crosses it fast.
3. **Moving gates keep a short swing** (amplitude 0.6 to 1.0, was 2.5 to 3.5) inside the column, so lead aiming still matters but the gate never travels into the sweep's dwell zone.
4. **Decoy on the left** (`add` gate at x -1.3) for the casual bot's 35% random picks; on L4 the -40 trap moves under it (x -1.3, y 16), on L5 the phase-2 -30 trap too.
5. **Nest HP re-centred** so the casual bot is back in band.

### Results (headless, 200 seeds per bot, scratch copy of main `83942ae`)

Before = main. After = values below. L1 after = M2-29 layout only (see `ftue-m2.md`).

| Stage | Level            | Idle before → after | Sweep before → after | Casual before → after | Aim before → after | Aim − sweep before → after | Casual band (current) |
| ----- | ---------------- | ------------------- | -------------------- | --------------------- | ------------------ | -------------------------- | --------------------- |
| 1     | ftue-meadow      | lose → lose         | 100 → 100            | 100 → 100             | 100 → 100          | 0 → 0 (exempt, see below)  | ≥ 95                  |
| 2     | dandelion-drift  | lose → lose         | 100 → **0**          | 98.5 → 98             | 100 → 100          | 0 → **100**                | ≥ 90                  |
| 3     | clover-run       | lose → lose         | 100 → **0**          | 74 → 71               | 100 → 100          | 0 → **100**                | 65 to 75              |
| 4     | thistle-gauntlet | lose → lose         | 100 → **0**          | 65 → 68.5             | 100 → 84.5         | 0 → **84.5**               | 65 to 75              |
| 5     | wasp-queen-nest  | lose → lose         | 100 → **54.5**       | 59.5 → **54.5**       | 100 → 100          | 0 → **45.5**               | 55 ± 5                |

Idle loses on every level (base seed, as `levelsBalance`). All 245 repo tests pass in the scratch copy with these values (including 18 px gate labels, gate contrast, the casual-band tests, `aim > centre`, and the new M2-28/M2-29 tests below), once the pinned values in the tests are updated (reference patch).

Notes:

- **L4 aim 84.5%:** the aim bot picks its plan on the base seed only, so it overfits a little. Still ≥ 75% (validator) and 84.5 points above the sweeper.
- **L5:** the sweeper falls off a cliff between nest HP 2500 (54.5%) and 2600 (14.5%), but at 2600 the aim bot's base-seed plan drops to 5.5%. 2500 keeps aim at 100% and casual at 54.5% (target 55, so centred; it was 59.5).
- **L1 (FTUE) is exempt (proposal, CEO note):** the FTUE is action-gated and the hive is shielded until step 5, so any layout that beats a sweeper there would also hurt the ≥ 95% casual and 30 s FTUE targets. M2-29 makes the FTUE itself teach aiming instead. L2 meets the 15-point gap without hurting casual, so it is not relaxed.

### Robustness: other sweep shapes (200 seeds, win %)

| Stage | ±3.5 at 1.3 (M2-12) | ±2.5 at 1.3 | ±4.5 at 1.3 | ±3.5 at 0.9 | ±3.5 at 1.8 | ±2.0 at 0.9 (gate-seeker) |
| ----- | ------------------- | ----------- | ----------- | ----------- | ----------- | ------------------------- |
| 2     | 0                   | 100         | 0           | 1           | 0           | 100                       |
| 3     | 0                   | 100         | 0           | 100         | 100         | 100                       |
| 4     | 0                   | 100         | 0           | 98.5        | 100         | 100                       |
| 5     | 54.5                | 100         | 0           | 46.5        | 50.5        | 100                       |

(L3 at 3050 and L4 at 3900; L2 and L5 at the values below.) **Risk, flagged:** the gap holds for the M2-12 sweeper and for wide sweeps, but not for a narrow ±2 to ±2.5 wiggle, which still covers the x 1.3 column about 40% of the time and stays out of the edge traps; on L3 and L4 a slower or faster ±3.5 sweep also still wins. M2-28's acceptance names the M2-12 sweeper, so it is met, but a player can still win by wiggling near the centre-right. A stronger fix (half-lane trap on the decoy side, tried in scratch) beats the narrow sweeps too but needs nest HP about 2× (L3 6000, L4 8000+) and still lets ±2 sweeps win, so I did not ship it. Proposal for M2-28b: measure a narrow sweeper on real players (QA) before going further.

### CI check for ENG (research request, PR 059)

New test `tests/aimPillarM2-28.test.ts`, alongside the casual-band tests:

- Add `sweepBot(amp, f)` to `tests/bots.ts` (same definition as `playtests/m2-12/sim-sessions.ts`).
- For each of `dandelion-drift`, `clover-run`, `thistle-gauntlet`, `wasp-queen-nest`: `winRate(L, aimBot(L), 200) - winRate(L, sweepBot(0.35, 1.3), 200) >= 0.15`. Timeout 600 s per level (bot runs are CPU-heavy).
- `ftue-meadow` is exempt (above).
- Keep the casual-band tests, updating pinned values: `cloverRunEase` (nest 3050, casual 65 to 75), `levelTuningM2-26` (thistle 3900, casual 60 to 75; boss 2500, gates per below, casual 50 to 60), `levels.test` (clover 7 gates, gate 2 per below), `balance.test` (scripted Clover player aims at x 1.3).

### Exact values for ENG (replace `nestHp` and `gates`; everything else unchanged)

**dandelion-drift** (nestHp 1200 → 1500):

```json
{
  "nestHp": 1500,
  "gates": [
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 9,
      "width": 2.4
    },
    {
      "kind": "add",
      "value": 2,
      "x": -1.3,
      "y": 9,
      "width": 2.4
    },
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 18,
      "width": 2.4,
      "motion": {
        "amplitude": 0.8,
        "speed": 0.8
      }
    },
    {
      "kind": "sub",
      "value": 600,
      "x": -3.8,
      "y": 5,
      "width": 2.4
    },
    {
      "kind": "sub",
      "value": 600,
      "x": 3.8,
      "y": 5,
      "width": 2.4
    }
  ]
}
```

**clover-run** (nestHp 2350 → 3050):

```json
{
  "nestHp": 3050,
  "gates": [
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 9,
      "width": 2.2
    },
    {
      "kind": "add",
      "value": 2,
      "x": -1.3,
      "y": 9,
      "width": 2.2
    },
    {
      "kind": "mul",
      "value": 3,
      "x": 1.3,
      "y": 17,
      "width": 2.2,
      "motion": {
        "amplitude": 0.6,
        "speed": 0.9
      }
    },
    {
      "kind": "sub",
      "value": 25,
      "x": -3,
      "y": 24.5,
      "width": 3.2
    },
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 25,
      "width": 2.6
    },
    {
      "kind": "sub",
      "value": 600,
      "x": -3.8,
      "y": 5,
      "width": 2.4
    },
    {
      "kind": "sub",
      "value": 600,
      "x": 3.8,
      "y": 5,
      "width": 2.4
    }
  ]
}
```

**thistle-gauntlet** (nestHp 2650 → 3900):

```json
{
  "nestHp": 3900,
  "gates": [
    {
      "kind": "add",
      "value": 5,
      "x": -1.3,
      "y": 8,
      "width": 2.4
    },
    {
      "kind": "mul",
      "value": 3,
      "x": 1.3,
      "y": 8,
      "width": 2.0
    },
    {
      "kind": "sub",
      "value": 40,
      "x": -1.3,
      "y": 16,
      "width": 2.4
    },
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 16,
      "width": 2.2
    },
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 24.5,
      "width": 2.6,
      "motion": {
        "amplitude": 1.0,
        "speed": 1.1
      }
    },
    {
      "kind": "sub",
      "value": 600,
      "x": -3.8,
      "y": 4,
      "width": 2.4
    },
    {
      "kind": "sub",
      "value": 600,
      "x": 3.8,
      "y": 4,
      "width": 2.4
    }
  ]
}
```

**wasp-queen-nest** (nestHp 3200 → 2500):

```json
{
  "nestHp": 2500,
  "gates": [
    {
      "kind": "mul",
      "value": 2,
      "x": 1.3,
      "y": 10,
      "width": 2.4
    },
    {
      "kind": "add",
      "value": 5,
      "x": -1.3,
      "y": 10,
      "width": 2.6
    },
    {
      "kind": "mul",
      "value": 3,
      "x": 1.3,
      "y": 18,
      "width": 2.6,
      "motion": {
        "amplitude": 0.8,
        "speed": 0.6
      }
    },
    {
      "kind": "sub",
      "value": 30,
      "x": -1.3,
      "y": 14,
      "width": 2.4,
      "fromPhase": 2
    },
    {
      "kind": "sub",
      "value": 600,
      "x": -3.8,
      "y": 5,
      "width": 2.4
    },
    {
      "kind": "sub",
      "value": 600,
      "x": 3.8,
      "y": 5,
      "width": 2.4
    }
  ]
}
```

**ftue-meadow** (M2-29): gate 0 `{ "kind": "mul", "value": 2, "x": 0, "y": 8, "width": 4.0 }` → `{ "kind": "mul", "value": 2, "x": -2.8, "y": 8, "width": 2.4 }`.

Full unified diff of the level JSON, the FTUE step and the test updates (scratch, for reference): `docs/design/m2-28-29-eng-reference.patch`.
