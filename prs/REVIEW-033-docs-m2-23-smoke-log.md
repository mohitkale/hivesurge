# Review: PR 033 docs/m2-23-smoke-log @ edbded4 (2026-10-11)

**Verdict: changes requested, not merged.**

**Blocker.** The PR's evidence files are missing from the commit. It only adds `playtests/m2-23/smoke60.mjs` and the PR doc. `.gitignore` has `*.log`, so `playtests/m2-23/smoke-60s.log` and `baseline-60s-pre-fix.log` were never committed. Fix by `git add -f`, or rename them to `.txt`.

The logs do exist outside git in `/workspace/hivesurge-artifacts/m2-23-smoke/`:

- Smoke run: SUMMARY with 0 WebGL warnings and star aria "3 of 3 stars".
- Baseline at 3f6ceec: 2 texImage3D warnings and no aria label.

The results back up PR 027.

**Nit.** The smoke SUMMARY says commit `f1108d0`, not `f4729de` as the doc states. These have the same patch (range-diff `=`), but the doc should say so.

## Re-review @ cfab9cb (2026-10-11)

**Verdict: changes requested, not merged.**

- **Scope: OK.** Docs and logs only: three `.txt` logs, `smoke60.mjs` and the PR doc. No secrets.
- **Baseline log: OK.** `baseline-60s-pre-fix-3f6ceec.txt` has 2 texImage3D warnings and no star aria. It is byte-identical to the original artifact.
- **`smoke-60s-f4729de.txt`: OK.** 0 warnings, "3 of 3 stars". It matches `/workspace/hivesurge-artifacts/m2-23-smoke/smoke-60s-f4729de.log`.
- **Blocker: `smoke-60s-f1108d0.txt` is mislabelled.** Its SUMMARY says `"commit":"f4729de"`, and it is identical to the f4729de file. The real f1108d0 run (`/workspace/hivesurge-artifacts/m2-23-smoke/m2-23-smoke-60s.log`, `"commit":"f1108d0"`) was not committed. The doc is also contradictory: one line describes this file as the f4729de tip, and another says it was run at f1108d0.
- **Fix:** commit the real f1108d0 log under that name (or drop the file), and make the doc's file list consistent.

The finding itself holds (0 warnings after the fix, 2 before), so this is an evidence-labelling fix only.

## Re-review @ d7dec87 (2026-10-11)

**Verdict: changes requested (doc only), not merged.**

- **Logs: all three fixed.** Each one is byte-identical to its artifact in `/workspace/hivesurge-artifacts/m2-23-smoke/`:

| File                               | Commit recorded | WebGL warnings |
| ---------------------------------- | --------------- | -------------- |
| `smoke-60s-f1108d0.txt`            | `f1108d0`       | 0              |
| `smoke-60s-f4729de.txt`            | `f4729de`       | 0              |
| `baseline-60s-pre-fix-3f6ceec.txt` | `3f6ceec`       | 2              |

- Lint passes. The PR is still docs and logs only.
- **Remaining blocker (doc):** `prs/033-docs-m2-23-smoke-log.md` line 8 still says ``smoke-60s-f1108d0.txt`: PR 027 tip `f4729de` ``. Lines 28–29 say it was run at f1108d0, the pre-rebase tip. Change line 8 to f1108d0 and add a bullet for `smoke-60s-f4729de.txt`. After that it can merge as-is.

## Re-review @ d160395 (2026-10-11)

**Verdict: approved, merged (--no-ff) as 4b07a41.** The only change since d7dec87 is the doc file list in `prs/033-docs-m2-23-smoke-log.md`. The f1108d0 file is now labelled as the pre-rebase tip, and the f4729de file has its own bullet. The doc is now consistent with lines 28–30 and the logs. Lint passes.
