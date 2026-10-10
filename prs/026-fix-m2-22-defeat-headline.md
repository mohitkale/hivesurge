# PR 026 — fix/m2-22-defeat-headline (M2-22; base: fix/world-boss-nits, PR 025)

**Summary:** The defeat headline now depends on nest damage (PR 002 QA bug 2: it was always "So close!").

**Changes**

- `src/ui/defeatCopy.ts`: `defeatHeadline(nestDamage)`.
  - "So close!" only when the nest has 50% or less health left (`NEAR_MISS_NEST_LEFT`, the same threshold as the
    revive offer).
  - "The nest held on" when some damage was dealt.
  - "The wasps won this one" when the nest is untouched.
- `src/game.ts`: the loss screen uses the selector.
- `tests/defeatCopy.test.ts`: 3 tests (near-miss boundary at 50%, untouched nest, partial damage).

**Repro (no fire, wait):** Headless Chrome against `vite preview`, with a seeded save at Clover Run, PLAY pressed and
no input. The defeat screen appeared after about 21 s with headline "The wasps won this one" and "Nest at 100% health".

**Test results:** `npm run lint` pass · `npm test` 127/127 · `npm run build` pass (game 56.43 kB / 19.13 kB gzip).

**Acceptance (PLAN M2-22):**

- "So close!" only on a near-miss (nest ≤ 50% left), other copy otherwise: met.
- Unit test on the headline selector: met.
- The no-fire repro shows non-near-miss copy: met.

**Reviewer:** hivesurge-review

**Status:** awaiting review
