# FTUE spec (M2-6): aim, gate, queen in under 30 s

Owner: DES. Implements in M2-7. Applies to level `ftue-meadow` (Level 1). Original theme only.

## Goals and budget

| Metric                            | Target | Hard cap                                        |
| --------------------------------- | ------ | ----------------------------------------------- |
| App open to first input           | 3 s    | 5 s                                             |
| First input to first gate pass    | 6 s    | 10 s                                            |
| First input to first queen launch | 18 s   | 30 s                                            |
| Words per prompt                  | 3 to 5 | 8                                               |
| Text panels / modals              | 0      | 0                                               |
| Ads, store, login prompts         | none   | none (ad-free for first 2 battles per adPolicy) |

## Step flow

No menu on first launch: boot straight into battle. Sim runs but waves are gated by step triggers, not clock, until step 5.

| Step        | Trigger to enter                             | Prompt (max 8 words)        | Visual cue                                                  | Exit condition                     | Timeout fallback                           |
| ----------- | -------------------------------------------- | --------------------------- | ----------------------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| 0 Boot      | load done                                    | none                        | camera dolly hive to nest, 1.5 s                            | auto                               | n/a                                        |
| 1 Aim       | step 0 done                                  | "Hold and drag to aim"      | animated finger on cannon, ghost trail                      | player holds fire 1.0 s cumulative | 4 s: finger pulses larger, haptic tick     |
| 2 Gate      | 15 bees fired                                | "Shoot through the x2 gate" | x2 gate glows, arrow above it                               | 10 bees pass the x2 gate           | 6 s: gate slides 1 unit toward cannon line |
| 3 Lead hint | first wasp group spawns (trigger, 8 wasps)   | "Aim ahead of moving gates" | dotted lead line from cannon to gate future x (0.6 s ahead) | 5 bees pass the moving gate        | 6 s: gate motion speed halves              |
| 4 Queen     | queen meter full (queenCharge = 4 s in FTUE) | "Tap the queen!"            | queen button bounces, rest of HUD dims 40%                  | queen launched                     | 5 s: auto-pulse + haptic; never auto-fire  |
| 5 Finish    | queen launched                               | "Smash the nest!"           | nest HP bar flashes                                         | battle ends                        | none                                       |

Lead hint rule (aim-lead): the dotted line targets `gateX(t + travelTime)` where `travelTime = (gate.y - CANNON_Y) / workerSpeed` (7 u/s). Shown only in step 3 and on any later level where the player misses a moving gate 3 times in a row (max once per battle).

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
    { "kind": "mul", "value": 2, "x": 0, "y": 8, "width": 4.0 },
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

- Step flow present: yes. Max words per prompt: longest is 5 words ("Aim ahead of moving gates"). Aim-lead hint included: step 3.
