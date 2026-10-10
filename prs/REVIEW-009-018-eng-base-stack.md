# Review: eng base stack 009 · 014 · 015 · 017 · 018 (2026-10-11)

Each PR was reviewed on its own changes, with `npm ci` in a scratch worktree per tip.

| PR                          | Tip     | Lint | Tests      | Build / budget                               | Verdict                                                        |
| --------------------------- | ------- | ---- | ---------- | -------------------------------------------- | -------------------------------------------------------------- |
| 009 feat/m2-5-levels        | 22e94b0 | pass | 82         | pass                                         | **changes requested** (blocks the stack when merged into main) |
| 014 feat/m2-7-ftue          | c2a3d4e | pass | 89         | pass                                         | approved                                                       |
| 015 feat/m2-16-size-budget  | 24aca65 | pass | 93         | pass; initial JS 2.13 KiB gzip, dist 589 KiB | approved                                                       |
| 017 feat/m2-13-guardrails   | b8b61fe | pass | 113/114 \* | pass; live-key guard clean                   | approved                                                       |
| 018 feat/m2-15-perf-overlay | 9fde3aa | pass | 117        | pass; dist 594 KiB                           | approved                                                       |

\* A slow test timed out. `levelsBalance` "thistle-gauntlet aiming beats firing straight" took 13.9 s against vitest's 5 s default. It is not a logic failure; it passes at 018 and in later tips. **Nit (009):** give the bot balance tests an explicit timeout, as 029 does.

No secrets anywhere in these five PRs.

## 009: blocker against current main

009's own changes are good: a 5-level campaign (ftue-meadow, dandelion-drift, clover-run, thistle-gauntlet, wasp-queen-nest), `nextLevelIndex`, `autoTriggers`, and bot balance tests. But 009 is based on pre-art main, and merging it into main `a706888`:

1. Conflicts in `src/game.ts` `makeScene()`: main has the art dev hook `__hsScene`, and 009 has `this.world.level`. Keeping both resolves it mechanically.
2. **Fails main's art test `tests/gate-label.test.ts`** ("farthest gate glyphs ≥ 18 px in every level", from PR 013). The new levels put gates too far away:
   - thistle-gauntlet gate y=27: 17.91 / 17.88 / 17.87 px at 360×640/740/780
   - wasp-queen-nest gate y=30: 17.66 px at 360×800

**Fix (eng, with art):** restack the eng stack onto main, resolve `makeScene`, then either move those far gates closer to the cannon (y ≤ ~26) or adjust `labelScale`/`frameCamera` so labels stay ≥ 18 px. Don't lower the threshold without art sign-off.

## 014 / 015 / 017 / 018 (own changes)

- **014 (M2-7):** action-gated FTUE, aim-ahead hint, `ftueDone` flag, `ftue_step` analytics; the generic hint is hidden during FTUE. Matches PLAN M2-7.
- **015 (M2-16):** `scripts/size-budget.mjs` (1 MiB gzip/brotli initial JS, 5 MiB dist) is part of `build`, with tests. It adds `@types/node`, so the shared `node_modules` needs `npm ci`. Matches M2-16.
- **017 (M2-13):** G1 (5 ad-free battles, FTUE done), G2 (no rewarded ads during FTUE), G5 (AdPacer caps), G6 (any purchase gives noAds via `applyPurchase`), G13 (sandbox shop) and G17 (live-key guard in the build). Matches M2-13.
- **018 (M2-15):** perf overlay (fps, draw calls, triangles) behind `?debug`/F3, plus instanced flowers (109→63 draw calls). Matches M2-15.

**PR 002 fixes preserved through 018 and 030:**

- `ResultSession.tryClaim` single payout, with buttons disabled after the first click.
- `markRewardedShown` blocks the interstitial.
- Revive resumes only if `world.revive()` succeeds.
- three.js stays in its own `manualChunks` chunk.

## Merge outcome

- Stack merge attempted on a706888. 009 merged with the mechanical `makeScene` resolution (f45243b), but tests then failed 4 times on the gate-label test. Following the stop-before-blocker rule, I discarded that unpublished local merge commit (main was reset to a706888 inside my temp worktree; nothing was pushed). **Nothing from 009–030 is merged.**
- PR 031 (design/revive-fix c48f208, docs only) was merged. See REVIEW-031.
