# Review — PR 042 art/m3-9-provenance @ `47ee752`

**Verdict: APPROVED and merged (`1b801ba`, --no-ff, onto main `ad6d483`).** The doc was renamed from provisional 037 to 042.

- Coverage: 82 assets (61 in public/assets + 21 in art/models), all listed with size, sha256 and an `art/tools/` generator. Licence: **TBD (Mohit decides)**.
- `tests/provenance.test.ts`: mutations in a scratch worktree failed as expected. Changed icon: 1 test failed. Missing GLB: 1 failed. Unlisted file: 2 failed. Restored: 5/5 pass.
- FTUE: `make-ftue-svgs.py` regenerates all 6 SVGs byte-identical.
- gltfpack pinned at 1.3.0. `rebuild-glbs.sh` re-run: all 26 GLBs byte-identical. `glbReexport.test.ts` checks triangles, bounds and colour, plus orphan GLBs.
- Oggs aren't rebuilt or rehashed in tests (only the committed bytes are hashed), so there's no flakiness from serials.
- Branch: lint OK, 202 tests pass, build OK. After merge: 204 tests pass (the extra tests come from main), build OK, initial JS 5.07 KiB raw / 2.26 KiB gzip, dist 899.32 KiB.
- No secrets in the diff.
- Nit: the claim that it "refuses other versions" is overstated; a `GLTFPACK=` override isn't version-checked.
- Housekeeping: main's `STATUS.md` (from `ad6d483`) failed prettier, which was a table reflow. I ran prettier on it in the follow-up commit, formatting only.
