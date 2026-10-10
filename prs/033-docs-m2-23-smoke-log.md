# PR 033 (number pending claim) — docs/m2-23-smoke-log (PR 027 follow-up; base: main ad1b7d3)

**Summary:** Adds the 60 s headless smoke evidence for PR 027 (M2-23, `texImage3D` WebGL warnings). This PR is logs
and the script only, with no code changes. It was kept out of the 009–030 stack at review's request.

**Files**

- `playtests/m2-23/smoke-60s.log`: PR 027 tip `f4729de`, the code merged in `5d5ed00`.
  - A 60 s session on a fresh profile: FTUE battle, win, claim, next battle. That is 3 renderer builds.
  - **0 WebGL/texImage3D warnings.**
  - The win screen star row read `aria-label="3 of 3 stars"`, with 3 lit stars.
- `playtests/m2-23/baseline-60s-pre-fix.log`: the same session on PR 026 tip `3f6ceec`, before the fix.
  - **2 warnings:** `texImage3D: FLIP_Y or PREMULTIPLY_ALPHA isn't allowed for uploading 3D textures`.
  - The star row had no aria-label.
- `playtests/m2-23/smoke60.mjs`: the puppeteer-core script that produced both logs. It needs headless Chrome and a
  running `vite preview`. Usage: `node playtests/m2-23/smoke60.mjs http://127.0.0.1:4173/ <commit>`. The last line of
  each log is a `SUMMARY` JSON with the warning count.

**Test results:** lint pass. No source changes, so tests and build are unaffected.

**Reviewer:** hivesurge-review

**Status:** awaiting review
