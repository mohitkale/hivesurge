# FTUE spec (M2-6): aim, gate, queen in under 30 s

Owner: DES. Implements in M2-7. Applies to level `ftue-meadow` (Level 1). Original theme only.

## Goals and budget

| Metric                            | Target | Hard cap                                        |
| --------------------------------- | ------ | ----------------------------------------------- |
| App open to first input           | 3 s    | 5 s                                             |
| First input to first gate pass    | 6 s    | 10 s                                            |
| First input to first queen launch | 18 s   | 30 s                                            |
| Words per prompt                  | 3 to 5 | 5 (M2-29; was 8)                                |
| Text panels / modals              | 0      | 0                                               |
| Ads, store, login prompts         | none   | none (ad-free for first 2 battles per adPolicy) |

## Step flow

No menu on first launch: boot straight into battle. Sim runs but waves are gated by step triggers, not clock, until step 5.

| Step                  | Trigger to enter                             | Prompt (max 5 words)        | Visual cue                                                  | Exit condition                                                 | Timeout fallback                                                                     |
| --------------------- | -------------------------------------------- | --------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 0 Boot                | load done                                    | none                        | camera dolly hive to nest, 1.5 s                            | auto                                                           | n/a                                                                                  |
| 1 Aim                 | step 0 done                                  | "Hold and drag to aim"      | animated finger on cannon, ghost trail                      | player holds fire 1.0 s cumulative                             | 4 s: finger pulses larger, haptic tick                                               |
| 2 Aim at gate (M2-29) | 15 bees fired                                | "Drag to the x2 gate"       | x2 gate (off-centre, left) glows, arrow from cannon to gate | 6 **aimed, off-centre hits** on the x2 gate (definition below) | 6 s: arrow and gate pulse, haptic tick; never auto-completes, the gate does not move |
| 3 Lead hint           | first wasp group spawns (trigger, 8 wasps)   | "Aim ahead of moving gates" | dotted lead line from cannon to gate future x (0.6 s ahead) | 5 bees pass the moving gate                                    | 6 s: gate motion speed halves                                                        |
| 4 Queen               | queen meter full (queenCharge = 4 s in FTUE) | "Tap the queen!"            | queen button bounces, rest of HUD dims 40%                  | queen launched                                                 | 5 s: auto-pulse + haptic; never auto-fire                                            |
| 5 Finish              | queen launched                               | "Smash the nest!"           | nest HP bar flashes                                         | battle ends                                                    | none                                                                                 |

Lead hint rule (aim-lead): the dotted line targets `gateX(t + travelTime)` where `travelTime = (gate.y - CANNON_Y) / workerSpeed` (7 u/s). Shown only in step 3 and on any later level where the player misses a moving gate 3 times in a row (max once per battle).

## M2-29: aiming step (step 2)

M2-12 found the FTUE never teaches aiming: the x2 gate sat at x 0, so firing straight up finished step 2. Step 2 now needs the player to drag the cannon onto an off-centre gate.

**Layout change:** the x2 gate moves from `x 0, width 4.0` to **`x -2.8, width 2.4`** (spans x -4.0 to -1.6). Its inner edge is 1.6 lane units from centre, so bees fired from the centre (jitter ±0.15 plus wobble, under 0.3 in 1 s) cannot cross it.

**Definitions (sim terms, checked every fixed step before `world.step`):**

- **Off-centre:** the target gate's span excludes the lane centre by at least 1.5 (`|gate.x| - gate.width / 2 >= 1.5`), and the cannon is at least `AIM_MIN_OFFSET = 1.5` from centre (`|world.cannonX| >= 1.5`).
- **Aimed:** the player is firing and the cannon is inside the gate's span, `|world.cannonX - world.currentGateX(g)| <= gate.width / 2`. `aimHoldS` counts continuous seconds of this; any tick that fails it resets it to 0.
- **Aimed, off-centre hit:** a bee crossing the x2 gate (`gatePasses[g]` increment) on a tick where `aimHoldS >= travel`, with `travel = (gate.y - CANNON_Y) / 7` (0.97 s at y 8). This makes sure the crossing bee was fired from inside the span, not swept through it.
- **Exit:** `aimedHits >= AIMED_HITS = 6` and the 1.5 s prompt dwell (M2-27) has passed.

**Timeout (6 s):** pulse the arrow and gate, haptic tick. The step never auto-completes and the gate never slides toward the centre (that would undo the lesson).

**Scripted players (scratch copy of main + this spec, `ftue-meadow`, headless):** time from first input.

| Player                                 | Step 2 done | Step 3 done | First queen launch | Timeouts      | Result          |
| -------------------------------------- | ----------- | ----------- | ------------------ | ------------- | --------------- |
| fast (0.3 s reaction)                  | 3.2 s       | 4.7 s       | 5.1 s              | none          | won             |
| typical (0.6 s)                        | 3.2 s       | 4.7 s       | 5.4 s              | none          | won             |
| slow (1.5 s)                           | 4.2 s       | 5.7 s       | 7.2 s              | none          | won             |
| slow, aims 0.9 off gate centre (1.5 s) | 4.3 s       | 5.8 s       | 7.3 s              | none          | won             |
| very slow (4 s)                        | 6.6 s       | 8.7 s       | 12.7 s             | step 1        | won             |
| very slow (6 s)                        | 8.6 s       | 10.1 s      | 16.1 s             | steps 1, 2, 4 | won             |
| never aims (fires from centre)         | never       | never       | n/a (stuck)        | step 2 pulses | stays in step 2 |
| M2-12 sweeper                          | 6.7 s       | 8.2 s       | 8.2 s              | none          | won             |

Every player who follows the prompts reaches the first queen launch well under 30 s (slowest 16.1 s). The sweeper also passes: it dwells on the gate for 1.7 s per sweep, which is a real aim. The test is that a centre-only player cannot pass.

**Prompts (all 5 words or fewer):** "Hold and drag to aim" (5), "Drag to the x2 gate" (5, was "Shoot through the x2 gate"), "Aim ahead of moving gates" (5), "Tap the queen!" (3), "Smash the nest!" (3).

**ENG tests (M2-29):** (1) the x2 gate's inner edge is at least 1.5 from centre; (2) a player firing from x 0 never leaves step 2 (`aimedHits === 0`); (3) a player aiming at `currentGateX(0)` completes step 2; (4) existing FTUE tests aim at `currentGateX(0)` during step 2 and still reach the queen under 30 s; (5) every prompt is 5 words or fewer. A reference patch is in `docs/design/m2-28-29-eng-reference.patch` (scratch only, not shipped code).

## FTUE level config (`ftue-meadow`)

```json
{
  "id": "ftue-meadow",
  "laneWidth": 10,
  "laneLength": 32,
  "timeLimit": 75,
  "nestHp": 600,
  "hiveHp": 60,
  "fireInterval": 0.11,
  "queenCharge": 4,
  "trickleInterval": 0,
  "gates": [
    { "kind": "mul", "value": 2, "x": -2.8, "y": 8, "width": 2.4 },
    {
      "kind": "add",
      "value": 3,
      "x": 0,
      "y": 15,
      "width": 3.6,
      "motion": { "amplitude": 2.0, "speed": 0.7 }
    }
  ],
  "waves": [
    { "trigger": "step3", "kind": "wasp", "count": 8, "x": 0, "spread": 2 },
    { "trigger": "step5", "kind": "wasp", "count": 12, "x": 0, "spread": 3 }
  ]
}
```

Expected run: queen at about 14 to 18 s, win at about 30 to 40 s. Target win rate 98%. Cannot lose before step 5 (hive damage disabled until step 5).

## Rules

- FTUE flag `ftueDone` stored in save; set on first win OR on second launch. Replay of Level 1 uses normal level `meadow-start` without prompts.
- Skip: none shown (it is already short). Returning players with existing save skip entirely.
- Prompts use HUD font, centred top third, 1 line, fade in 150 ms; respect reduced motion (no bounce, static highlight).
- Every prompt also has an audio cue and caption for accessibility (M2-11).
- Analytics: `ftue_step` event `{step, msSinceFirstInput, timedOut}` for each step; QA passes if headless bot reaches step 4 exit in under 30 s.

## Revive

Revive offer rules (early close, ad failure, free fallback): see `revive-m2.md` (M2-20). No revive offer during FTUE.

## Acceptance check

- Step flow present: yes. Max words per prompt: 5 (M2-29 cap; longest are "Hold and drag to aim", "Drag to the x2 gate" and "Aim ahead of moving gates"). Aiming taught: step 2 needs aimed, off-centre hits (M2-29). Aim-lead hint included: step 3.
