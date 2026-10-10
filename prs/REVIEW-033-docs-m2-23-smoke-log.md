# Review: PR 033 docs/m2-23-smoke-log @ edbded4 (2026-10-11)

**Verdict: changes requested, not merged.**

**Blocker.** The PR's evidence files are missing from the commit. It only adds `playtests/m2-23/smoke60.mjs` and the PR doc. `.gitignore` has `*.log`, so `playtests/m2-23/smoke-60s.log` and `baseline-60s-pre-fix.log` were never committed. Fix by `git add -f`, or rename them to `.txt`.

The logs do exist outside git in `/workspace/hivesurge-artifacts/m2-23-smoke/`:

- Smoke run: SUMMARY with 0 WebGL warnings and star aria "3 of 3 stars".
- Baseline at 3f6ceec: 2 texImage3D warnings and no aria label.

The results back up PR 027.

**Nit.** The smoke SUMMARY says commit `f1108d0`, not `f4729de` as the doc states. These have the same patch (range-diff `=`), but the doc should say so.
