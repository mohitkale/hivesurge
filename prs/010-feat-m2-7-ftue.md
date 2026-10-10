# PR 010 — feat/m2-7-ftue (M2-7; base: feat/m2-5-levels, PR 009)

**Summary:** Implements the FTUE from `docs/design/ftue-m2.md` on level `ftue-meadow`. On first launch the game skips
the menu and boots straight into the battle. Steps are action-gated (aim → gate → aim-ahead → queen → finish), with
prompts of 8 words or fewer, an aim-ahead line, a hive shield until step 5, `ftue_step` analytics and a `ftueDone`
save flag.

**Changes**

- `src/ftue/ftue.ts`: pure `Ftue` controller.
  - Each step advances only on its taught action:
    - Aim: 1.0 s of cumulative fire.
    - Gate: 10 bees through the ×2.
    - Lead: 5 bees through the moving gate.
    - Queen: queen launched.
    - Finish: battle over.
  - Fires the level's "step3" and "step5" trigger waves. Sets `world.hiveShield` until step 5.
  - Timeouts (4/6/6/5 s) only set `emphasis` (the prompt pulses). They never auto-advance or auto-fire.
  - Records `{step, msSinceFirstInput, timedOut}` per step.
  - `leadTargetX` = `gateX(t + travelTime)` of the moving gate, with `travelTime = (gate.y − CANNON_Y) / 7`.
- `src/sim/world.ts`: `gatePasses[]` per gate; `hiveShield` (wasps reaching the hive deal 0 damage).
- `src/game.ts`:
  - Boots into the FTUE when `!ftueDone` and the current level is `ftue-meadow`.
  - Feeds the controller every fixed step and logs `ftue_step`.
  - Shows the prompt; in step 4 it dims the HUD and bounces the queen button.
  - Draws the lead line in step 3.
  - Sets `ftueDone` on the first FTUE win, or at launch if any battle has been played (the spec's "second launch"
    rule). Replays and other levels use `autoTriggers` without prompts.
- `src/ui/hud.ts` + `style.css`: `.ftue-prompt` (top third, one line, 150 ms fade, `aria-live`). Reduced motion swaps
  the bounce for a static outline.
- `src/render/scene.ts`: dashed `leadLine`.
- `src/platform/save.ts`: `ftueDone` (parsed defensively; sticky in `mergeSaves`).
- `src/analytics/analytics.ts`: `ftue_step` event name.
- `tests/ftue.test.ts`: 7 tests.
  - A headless scripted new player (0.6 s reaction per prompt) launches the queen in under 30 s and wins, with all 5
    steps completed in order.
  - An idle player stays on step 1 with emphasis and no waves.
  - The hive takes no damage before step 5.
  - The lead line appears only in step 3.
  - Prompts are 8 words or fewer.
  - `ftue_step` timings are monotonic.
  - FTUE is skipped on replay or when done.

**Test results:** `npm run lint` pass · `npm test` 89/89 (12 files) · `npm run build` pass. Entry 4.80 kB
(2.15 kB gzip), game 51.64 kB (17.68 kB gzip), three 540.94 kB (134.79 kB gzip; `LineDashedMaterial` adds about
3 kB), CSS 4.94 kB.

**Headless browser playtest:** puppeteer-core installed in `/tmp`, not added to the repo. Chrome headless, 390×844,
`vite preview`. The bot holds the mouse at the centre of the lane and presses Q when "Tap the queen!" shows. The
`ftue_step` events recorded in localStorage were:

| Step | `msSinceFirstInput` | `timedOut` |
| ---- | ------------------- | ---------- |
| 1    | 983                 | false      |
| 2    | 2083                | false      |
| 3    | 2400                | false      |
| 4    | 4467                | false      |
| 5    | 14000               | false      |

- First queen launch came 4.5 s after first input. The battle was won and the result modal showed about 15.8 s after
  first input. No page errors.
- An earlier run gave a queen launch at 4.2 s.

**Acceptance (PLAN M2-7):**

- Queen launch in under 30 s in a headless playtest: met (4.5 s).
- FTUE skipped on replay: met.
- Action-gated steps: met.
- Aim-ahead line uses `gateX(t + travelTime)`: met.
- `ftueDone` save flag: met.
- `ftue_step` event per step: met.

**Not implemented from the spec (follow-ups):**

- Step 0's camera dolly. A plain 1.5 s wait is used instead.
- Timeout fallbacks that change the level (gate slides 1 unit closer; moving gate halves its speed). Only the
  prompt/queen-button pulse is done.
- Haptic tick on timeout.
- Audio cue and caption per prompt (M2-11).
- The lead hint on later levels after 3 missed moving gates.
- A separate `meadow-start` level for replays. Replays reuse `ftue-meadow` without prompts.
- Session-level M2-13 guardrail interplay: PR 008 also adds `ftueDone`. It will be restacked onto this branch so there
  is one definition.

**Reviewer:** hivesurge-review

**Status:** awaiting review + playtest
