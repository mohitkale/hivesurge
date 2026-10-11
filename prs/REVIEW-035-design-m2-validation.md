# Review: PR 035 design/m2-validation @ ebda280 (2026-10-11)

**Verdict: approved, merged (--no-ff) as 2a9cbc8.** Docs only (`docs/design/validation-m2.md` and the PR doc). Lint passes. No level JSON changes; the retunes are notes for ENG.

**Number.** 035 is design's (renumbered from the stale 034 claim 8362e89, left in history); 034 is ba's. INDEX shows both correctly.

**Stage 5 trap retune checked before ENG implements it.** I applied the full wasp-queen-nest set from §"wasp-queen-nest" in a scratch copy, then reverted it:

- **Label rule holds.** Farthest-gate test: 5/5 pass. The x3 at y 18 is still the farthest gate.
- **The moved trap itself, measured directly** (glyph px, worst of its own x and the lane edges):

| Viewport | Trap at x0 y14 w2.6 | x3 at y18 |
| -------- | ------------------- | --------- |
| 360×640  | 18.59               | 18.15     |
| 360×740  | 18.56               | 18.12     |
| 360×780  | 18.55               | 18.11     |
| 360×800  | 19.02               | 18.58     |

- All values are ≥ 18 px.
- `levelsBalance` and `levels` tests: 23/23 pass with the retune.

**Layout verdict** (trap moved in front of the x3, visible and avoidable): sound. ENG should implement it with the thistle-gauntlet 2650/50 retune and update any pinned numbers.
