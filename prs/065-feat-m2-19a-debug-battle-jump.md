# PR 065: feat/m2-19a-debug-battle-jump

Number not claimed yet: `main` is checked out at `/tmp/rev-merge` (with uncommitted INDEX/review edits), so the temporary-worktree claim wasn't forced. Rename to `prs/NNN-feat-m2-19a-debug-battle-jump.md` once a number is claimed (next free on main `57a32a0`: 064, or 065 after the starter-skin PR).

QA M2-19a couldn't re-check G4 because the box has no GPU (3–12 fps), so battle 6+ was out of reach. Base: main `57a32a0`.

## Changes

- `src/debug/debugParams.ts`: new dev-only `?battle=N` (use `?debug&battle=6`). `seedSaveForBattle` makes the next battle the Nth: FTUE done, `battlesCompleted = N-1`, and one star on the first N-1 levels. G1 (interstitials from battle 6) and G2 (rewarded offers from battle 4) then apply as they would on a device. It never lowers existing progress or stars. N must be an integer from 1 to 999; anything else is ignored.
- Production: `Game.debug` is `NO_DEBUG` outside `import.meta.env.DEV` (same as `?level=` and `?revive=force`). The seed call is also wrapped in `import.meta.env.DEV`. A production `dist/` has no `?battle` parsing or seed code (checked by grepping the build).
- Note: the seed writes into the dev save on the next commit. Clear localStorage (`hivesurge` keys) to start over.
- `adPolicy.shouldShowInterstitialOnClaim()`: the claim-time interstitial decision (G3 transition, policy, G5 caps), moved out of `game.ts` `claim()` unchanged, so the test runs the real code path.

## QA usage

`npm run dev`, then open `/?debug&battle=6` (add `&revive=force` to always get the revive offer, and `&level=<id>` to choose the level). Lose, revive with the rewarded ad, win, then Collect: no interstitial should show.

## Tests

`tests/debugBattleJump.test.ts` (5):

- Parsing works in dev only and rejects junk. Seeding is monotonic, and battle 1 is a no-op.
- Integration (G4) at battles 6 and 9, mirroring `game.ts`: the save is seeded through `debugParamsFromUrl` and `seedSaveForBattle`. A World battle is lost on a close call, the revive offer is eligible, and a rewarded ad completes and grants it (`ReviveOffer`, `world.revive()`, `ResultSession.afterRevive`). The battle is then won, `forBattleEnd`, claimed via Home, and `shouldShowInterstitialOnClaim` returns **false**. Control: the next battle, won without a revive, returns **true**.
- Control: at battle 3, G1 blocks the interstitial.

`tests/m2-21-qa.test.ts`: the expected `DebugParams` now includes `battle: null`.

## Checks

ESLint ok (10.12.0, worktree npm ci) · prettier fails only on 3 files already unformatted on main 57a32a0 (playtests/m2-12/results/post-m2-26/sim-sessions.json, playtests/m2-19a-2026-10-14.md, prs/059-qa-m2-19a-emulation-perf.md), none touched here · tests 266/266 · build ok · size budget: initial JS 2.34 KiB gzip, dist 907.36 KiB. Logs: `/tmp/s2-*.txt`.

Reviewer: `hivesurge-review` · Status: `awaiting review + playtest`.
