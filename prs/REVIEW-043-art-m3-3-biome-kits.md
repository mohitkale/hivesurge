# Review: PR 043 art/m3-3-biome-kits @ `6cb48b1`

**Verdict: CHANGES REQUESTED. Not merged.** Please rebase onto main (after the PR 042 merge, `1b801ba`/`58f7c72`), run `python3 art/tools/make-provenance.py`, rename the doc to `prs/043-art-m3-3-biome-kits.md`, and re-run lint, tests and build.

## Blocking

1. **Provenance test fails after PR 042.** I did a trial merge onto `58f7c72` (`--no-commit`, then aborted): 2 failed, 215 passed (217 tests). The failing tests are `tests/provenance.test.ts`: "every asset file is listed" and "size/sha256 match". The new `art/models/biome-*.glb` files are not in `art/PROVENANCE.md`.
2. **Merge conflict in `art/ART_DIRECTION.md`.** Both 042 and 043 add a section there. Resolve it during the rebase and keep both.

## Checked OK

- **Biome mapping** (`LEVEL_BIOME`): Clover for ftue-meadow, dandelion-drift and clover-run (L1-3); Orchard for thistle-gauntlet and wasp-queen-nest (L4-5).
- **Budgets** (`BIOME_BUDGET`): ≤300 triangles per prop, ≤12 props, ≤30k scene triangles and ≤12 draw calls; ≤100 KB of GLBs per kit. The tests pass.

  | kit     | props | tris (sum) | max prop tris      | GLB bytes       |
  | ------- | ----- | ---------- | ------------------ | --------------- |
  | clover  | 10    | 733        | 124 (flowers)      | 33,352 (~33 KB) |
  | orchard | 10    | 561        | 124 (flowerOrange) | 30,116 (~29 KB) |

- **Clean-room:** every GLB generator field is `gltfpack 1.3`. I found no copyright, extras or third-party names in the GLBs or in `src/art/biomes.ts`. All geometry is procedural.
- **Code delta is small:** `biomeFor(level.id, location.search)` is passed to `GameScene`, and `grassTexture(base, band)` takes optional parameters whose defaults are unchanged.

## Re-review @ `11795e5` (rebased onto `c5049f4`): APPROVED, merged `9a73510`

- `ART_DIRECTION.md` keeps both sections: 042's provenance/pipeline bullet in §9 and 043's §10 biome kits. Nothing from main was removed.
- `PROVENANCE.md` covers 88 assets, including the 6 new biome GLBs. The licence is still **TBD (Mohit decides)**.
- The doc is renamed to `prs/043-art-m3-3-biome-kits.md`.
- `8f3f786` (the gltfpack pin enforcement) is on this branch. I tested it with fake gltfpack binaries:
  - banner 1.2, 1.4 or 1.3.1: exit 2
  - npm package.json version 1.3.1 with banner "gltfpack 1.3": exit 2
  - real gltfpack@1.3.0: exit 0, all 32 GLBs byte-identical
- After merge: lint OK, 217/217 tests pass, build OK.
- Bundle after merge:
  - initial JS: 5.07 KiB raw / 2.25 KiB gzip
  - game: 80.66 kB
  - three: 577.27 kB
  - dist total: 901.17 KiB
- This resolves the nit in REVIEW-042 that the "refuses other versions" claim was overstated.
