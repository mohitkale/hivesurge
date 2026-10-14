# PR 087: fix/m2-31-32-gate-feedback

QA M2-12 box sessions (`playtests/m2-12/qa/2026-10-15-box-sessions.md`, `qa/m2-12-box-sessions`
@ 03e76fe): M2-31 (major) and M2-32 (major).

## M2-31: missed-gate feedback

- **Spec search:** `docs/design` and every `design/*` branch have no miss-cue spec.
  `design/m2-12-qa-response` has no commits beyond main. The only "miss" rule is the M2-7b
  aim-lead replay after 3 misses, which is not this. **Design must confirm the cue below.**
- **What I implemented (minimal, behind `MISS_CUE` in `src/ui/missCue.ts`; `enabled: false`
  turns it off):**
  - The world now keeps a miss counter for each positive-gate row: a bee that crosses a row's y
    without passing any of its gates counts as a miss. These are counters only, with no per-bee
    events or allocations. Traps and later-phase gates are excluded.
  - When 6 bees have missed one row, a "Missed!" floater appears at the cannon's x on that row.
    After that it waits a 3 s cooldown, and misses during the cooldown don't stack up.
  - It applies on all levels.
- **The straight-up volleys are not a bug.** This is a lane shooter: bees launch from the cannon's
  x and fly straight up their column with a small wobble. Measured on L1 from the centre, they
  drift less than 1.2 units, while the x2 span starts at |x| 1.6. You aim by sliding the cannon.
  The tester's "press-hold sets aim, release fires" model and centre holds explain the volleys
  missing x2 and +3. The aim-preview decision stays with design.

## M2-32: L2 trap values change mid-level

**This is intended behaviour, not a bug, so behaviour is unchanged.**

- L2 (`dandelion-drift.json`) has two `sub 600` traps at x ±3.8, y 5, width 2.4. They are the
  M2-28 edge traps from `levels-m2.md`: "600 lasts the whole battle".
- `World.trapLeft` starts at `value`. Each bee that crosses a trap is absorbed and decrements it.
  At 0 the trap breaks and its label becomes ✓.
- `scene.ts` redraws the label as `−<remaining>` every time the count changes. That's why QA saw
  −600 → −580 → −550. The game never explains this.
- **For design** (they own L2 yield, damage and telegraphing):
  - Decide whether to teach or relabel the countdown, e.g. a static "−600" with a fill bar, or a
    first-hit tooltip.
  - QA's "6–19 bees per 3 s hold on L2" fits bees lost to these edge traps plus the x 1.3 gate
    column. That's a yield and tuning question for design.

## Tests

`tests/gateFeedbackM2-31-32.test.ts`:

- The M2-31 counter, the cue thresholds and cooldown, and the L1 centre vs aimed cue fail on main
  (no counters or cue) and pass with the fix.
- The straight-up drift test and the M2-32 trap-countdown test pin the current, intended
  behaviour, so they pass on main too.

**Headless (dev, fresh profile, L1):**

- Holding the cannon in the centre shows "Missed!" at 4.4 s after load, beside the x2 row.
- Aiming at x2 shows no further x2-row cue. The moving +3 row still cues when its gate is missed.
- No page errors.

## Design ruling (2026-10-15) – follow-up commits

Review numbered this PR 087. Review will rename this doc at merge, so the pending name stays.

### M2-31 miss cue (`MISS_CUE`, `src/ui/missCue.ts`)

- The cue is "Missed!". It fires after 6 bees pass a row without a gate hit, with a **4 s**
  cooldown and **at most 3 per level**.
- It is suppressed while any FTUE prompt is on screen. Misses during suppression or cooldown are
  absorbed, so they never trigger a delayed cue.
- **On for all levels.** Design confirmed this, which overrides review's suggestion to keep it off
  by default.
- Note: L1 prompts are on screen for most of the first FTUE attempt, so the cue mostly shows on
  later levels, and on retries once PR 086 hides learned steps.

### M2-32 trap telegraph (`src/ui/trapTelegraph.ts`, `scene.ts`)

- The trap label stays fixed at its starting value (`−600`) and becomes `✓` once broken, as
  before.
- A red fill bar under the label plate drains as the trap absorbs bees.
- On the first trap hit on L2 (`dandelion-drift`), a tip shows for 4 s: "Traps eat bees until
  drained. Aim for gates!"
- **Persistence:** the tip is saved per device (`save.trapTipShown`, merged with OR), so it shows
  once ever on a device, not once per session.
- Trap yield and damage are unchanged: still one bee absorbed per crossing, 600 in total.

### Tests and checks

- Tests cover the ruling constants, the 4 s cooldown, the 3-per-level cap, FTUE suppression and
  its wiring, the fixed label, the bar drain, the one-time tip (including save parse and merge),
  and the unchanged sim.
- **Headless (L2, `?level=dandelion-drift`, FTUE done):**
  - First trap hit: the label still reads −600 after 19 bees absorbed (581 left), the bar is at
    96.8%, and the tip shows, then clears after 4 s.
  - After a reload, the next battle shows no tip.
  - No page errors.
