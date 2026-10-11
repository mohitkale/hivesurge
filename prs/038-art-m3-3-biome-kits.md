# PR 038 — art/m3-3-biome-kits (base: main @ b7f4f42)

> **Number not yet claimed in `prs/INDEX.md` on main.** 034 was taken (ba's `chore/plan-m2-assignments`, and design
> was renumbered to 035). 036 was claimed by ba, and 037 is used by hivesurge-art's `art/m3-9-provenance`. hivesurge-art does not
> commit to main, so the INDEX owner needs to add:
> `| 038 | art/m3-3-biome-kits | hivesurge-art | <tip> | open (claimed) | 038-art-m3-3-biome-kits.md |`

**Task:** PLAN **M3-3**, environment kits per biome + UI icon set. AC: ≥ 2 biome kits, ≥ 30 icons SVG; licence = original.
Icons were already done (41 in `public/assets/icons`, PR 011). This PR completes the biome kits.

**What was there:** `src/art/biomes.ts` had Clover Meadow + Sunset Orchard as palettes + edge props, but the game
always used Clover. Lane grass, soil and rails were hard-coded, and Orchard was never shown.

**Changes**

- `src/art/biomes.ts`: kits now also cover hemisphere light, rail posts and backdrop set pieces. New original props:
  dandelion, bush, hill (Clover); hay bale, hedge, hill (Orchard). Added `BIOME_BUDGET`, the deterministic `layoutBiome()`
  (shared by the renderer and the tests), `LEVEL_BIOME` (L1–L3 Clover, L4–L5 Orchard) and `biomeFor(levelId, ?biome=)`.
- `src/render/scene.ts`: lane grass, soil, rails and light come from the kit, and the environment is drawn from
  `layoutBiome` (one InstancedMesh per prop). `src/render/textures.ts`: `grassTexture(base, band)`.
- `src/game.ts`: 1 line, passes `biomeFor(level.id, location.search)` to `GameScene`.
- `art/models/biome-*.glb`: +6 GLBs for the new props (gltfpack 1.3.0). Existing GLBs re-exported byte-identical.
  Not shipped, so the runtime is unchanged.
- `tests/biomes.test.ts`: ≥ 2 complete kits, ≤ 300 tris/prop, ≤ 12 props/kit, ≤ 30k env tris and ≤ 12 draws per scene on every level,
  no prop inside the lane, a GLB per prop ≤ 100 KB per kit, every level mapped, both kits used, `?biome=` override.
- `art/ART_DIRECTION.md` §10 (kits, budgets, readability rule). `art/tools/biome-shots.mjs`: second-battle captures.

**Budget numbers:** Clover 10 props, max 124 tris/prop, ≤ 6,951 env tris, 10 draws. Orchard 10 props, max 124 tris/prop,
≤ 6,808 env tris, 10 draws. Kit GLBs: 33.4 KB + 30.1 KB = 63.5 KB. All GLBs: 134.8 KB, within M3's 1.5 MB.
Initial JS is unchanged (5.07 KiB); dist 900 KiB, within the 5 MiB limit (size-budget script).

**Screenshots:** `art/screenshots/biomes/{clover,orchard}-{m360,desktop}-assets-{on,off}.png`, 8 files. All from the
**second battle** on a fresh save. With assets on, `glbUsed` = bee, queen, wasp, hornet and cannon. With `?assets=off`,
`glbUsed` = [], which is the procedural fallback. "Desktop" is 1280×800, where the game keeps its centred portrait column.

**Note on overlap:** PR 037 (`art/m3-9-provenance`) adds `art/PROVENANCE.md` and a test that every asset is listed.
Whichever merges second must re-run `python3 art/tools/make-provenance.py` so the 6 new biome GLBs are listed.

**Reviewer:** hivesurge-review · **Status:** open
