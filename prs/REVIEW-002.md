# Review — PR 002 feat/core-loop

**Verdict: CHANGES REQUESTED — not merged.**

Checks (branch feat/core-loop): `npm install` ok · `npm run lint` pass · `npm test` 7 files / 48 tests pass ·
`npm run build` (tsc --noEmit + vite) pass — JS 579.68 kB (148.63 kB gzip), over Vite's 500 kB warning.
No secrets found. Branch already contains PR 001 (now merged), so diff vs main is just the feature.

## Blocking

1. **Rewards can be claimed more than once (coin dupe).** `claim()` (src/main.ts:246-247) credits coins with no guard, and result buttons wired via `bind()` (src/main.ts:281) are never disabled. Double-clicking "No thanks"/"Home", or clicking 2X (src/main.ts:212-214) and then "No thanks" (src/main.ts:216) while the win card is still in the DOM under the ad modal, credits coins twice (2X + 1X). Make claim idempotent per battle (e.g. `claimed` flag) and disable/clear buttons on first click.
2. **Interstitial can chain right after a rewarded ad.** src/main.ts:214 passes `rewardedShown = ok`, so a rewarded ad that was shown but closed early counts as "not shown" and an interstitial may follow — violates adPolicy.ts' "never after a rewarded ad on the same transition" and checklist item 10. Pass `true` whenever a rewarded ad was shown.
3. **Merge gate not met per CONTRIBUTING.md:11.** Human browser playtest (checklist items 2, 4–6, 9, 11–13) is still outstanding, as the PR itself states; only a headless smoke run was done.

## Non-blocking / nits

- src/main.ts:234 ignores the `boolean` returned by `world.revive()`; if it returns false the UI still switches to battle on an ended world. Check the result.
- src/platform/save.ts:70 `mergeSaves` takes max(coins/gems) across devices — spend on one device can be undone by another. Fine for now; document or use a ledger before cloud save.
- playtests/smoke-playtest.mjs imports `puppeteer-core` (not in devDependencies), hard-codes `/workspace/...` and `/usr/bin/google-chrome`, and is excluded from lint (eslint.config.js). Add the dep or document it; use relative paths.
- Bundle 580 kB: split three.js into a separate chunk (`manualChunks`) or lazy-load.
- src/main.ts:334 uses `Math.random()` for float text — cosmetic only, but keep sim RNG separate as is.
- PLAN.md now marks PR 001 as awaiting review; update after this merge.

---

# Re-review: fix/pr-002-review @ a4e56c8, stacked on feat/core-loop (2026-10-11)

**Verdict: code blockers #1 and #2 are fixed, and the nits are addressed. PR 002 stays unmerged until QA posts a passing human playtest (blocker #3).**

Checks (in the eng-fix-pr-002-review worktree): `npm run lint` pass · `npm test` 52/52 (8 files) · `npm run build` pass: index 42.34 kB (14.90 kB gzip) + three 537.84 kB (134.09 kB gzip).

- #1 double claim: fixed. `ResultSession.tryClaim()` (src/platform/resultSession.ts) guards `claim()`. `disableResultButtons()` runs on the first click of 2X, Revive, and any path through `claim()`. Each battle end creates a fresh session.
- #2 interstitial after rewarded: fixed. `watchRewarded()` calls `markRewardedShown()` before the ad, so a rewarded ad closed early still blocks the interstitial.
- manualChunks: done (vite.config.ts), and three.js is now its own chunk.
- Revive: it only resumes if `world.revive()` returns true.

Nits (non-blocking):

- The tests cover the pure `ResultSession` only; nothing tests the main.ts wiring. QA should cover double clicks and 2X → close early → no interstitial.
- When a revive ad is closed early, the loss screen re-renders and offers Revive again with no limit. That's acceptable because it's optional, but consider capping it.
- `chunkSizeWarningLimit: 800` hides the warning for the 538 kB three chunk. That's fine, but it should be documented.
- To land this: fast-forward feat/core-loop to a4e56c8. It's checked out in the shared main checkout, which has uncommitted files, so do it with care.

---

# Update: fix/pr-002-review rebased to e148dde on main b60e960 (2026-10-11)

- Revive is now offered at most once per result (`canOfferRevive`), with tests. `chunkSizeWarningLimit` was removed, so the warning shows. lint pass · tests 54/54 · build pass (42.56 kB + three 537.84 kB).
- I did not fast-forward feat/core-loop. It's 3ea08a5, and the fix is now rebased onto main, so moving it would rewrite history rather than fast-forward. feat/core-loop is also checked out in the shared /workspace/hivesurge checkout, which has local edits (package-lock.json). The CEO needs to decide: either repoint feat/core-loop to e148dde (non-FF; first switch the shared checkout off it), or treat fix/pr-002-review as the PR 002 branch.
