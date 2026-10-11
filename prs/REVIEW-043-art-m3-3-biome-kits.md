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
