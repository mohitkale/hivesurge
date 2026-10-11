# M3-9: Clean-room sign-off of the M3 art pass (main @ 4cb198c, 2026-10-11)

**Verdict (updated 2026-10-11 after PR 042, merge `1b801ba`): M3-1 signed off. The licence is still pending Mohit.** Issues 1–3 below are resolved by PR 042 (see the addendum at the end). The original verdict, NOT signed off with 3 issues, is kept below for history.

## Scope

- **Style guide:** `docs/art/style-guide.md`, a pointer to `art/ART_DIRECTION.md`. Its line 4 has the clean-room statement: "every shape, colour, icon and sound here is original and made from code in this repo … No third-party IP, assets or reference images were used."
- **Models:** 5 runtime GLBs in `public/assets/models/` and 21 in `art/models/` (26 total, 116,592 B).
- **Icons:** 41 SVG in `public/assets/icons/` (19,282 B), plus 6 FTUE SVG in `public/assets/ftue/` (2,727 B).
- **Audio:** 9 Ogg/Opus in `public/assets/audio/` (133,895 B).
- **Textures:** none. Vertex colours only; no PNG/JPG/KTX2/fonts under `public/` or `src/`.
- **Also checked:** the 10 screenshots in `art/screenshots/`. These are captures of our own build.

## Provenance per asset class

| Assets       | Source                                                                                            | Evidence                                                                                                                                                                                                                                                    | Result                                                     |
| ------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 41 UI icons  | `art/tools/make-icons.py` (pure Python geometry)                                                  | Re-ran it in a scratch copy: **all 41 files byte-identical**                                                                                                                                                                                                | proven original                                            |
| 9 audio cues | `art/tools/make-audio.sh` (ffmpeg `aevalsrc` maths, no samples)                                   | Re-ran it: **decoded PCM identical for all 9**. Ogg container bytes differ only by stream serials. Durations match the script.                                                                                                                              | proven original                                            |
| 26 GLBs      | `art/tools/export-assets.ts` ← procedural `src/art/models.ts`, `skins.ts`, `biomes.ts` → gltfpack | Every GLB says `generator: gltfpack 1.3`. None has a copyright field, extras, images or textures. Node/mesh names are only `flat`. Tri counts match the procedural counts in ART_DIRECTION §8. **Not rebuilt here: `gltfpack` isn't installed on the box.** | original by construction; byte-level reproduction not done |
| 6 FTUE SVGs  | hand-written SVG (PR 012, `2094951`). No generator.                                               | Only `<title>ftue-*</title>` and plain paths. No `<metadata>`, editor namespaces, embedded images or base64.                                                                                                                                                | original by inspection only (**unprovable from a file**)   |
| Screenshots  | captures of our build                                                                             | PNGs have no tEXt/iTXt/eXIf chunks                                                                                                                                                                                                                          | fine                                                       |

**IP scan.** I grepped `art/`, `docs/art/`, `public/` and `src/art/` for existing game, studio or character names (Mob Control, Voodoo, Count Masters, Crowd City, Supercell, Pokémon, Disney, Nintendo, Marvel, Maya the Bee, Bee Movie, …) and for copyright strings ("©", "(c) 20", "all rights reserved", "logo"). **0 hits.** GLB `asset`/`extras`, Ogg tags (only `encoder=Lavc61.19.101 libopus`) and SVG metadata are clean.

## Budget spot-check (PLAN M3-2 / M3-4, ART_DIRECTION §8)

| Budget                           | Limit       | Measured                                                                                                                                           | OK                                         |
| -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Triangles per unit (incl. skins) | ≤ 300       | bee 220 · queen 270 · wasp 130 · hornet 142 · skins 220–268                                                                                        | yes                                        |
| Props (single instance)          | n/a         | cannon 264 · nest 382                                                                                                                              | n/a                                        |
| Model total (26 GLB)             | ≤ 1.5 MB    | 116,592 B (113.9 KiB); largest single file 6,816 B                                                                                                 | yes                                        |
| Audio total (M3-4)               | ≤ 1 MB      | 133,895 B; music loop 98,548 B                                                                                                                     | yes                                        |
| Icons (M3-3)                     | ≥ 30        | 41 (+ 6 FTUE)                                                                                                                                      | yes                                        |
| Textures                         | KTX2 if any | none                                                                                                                                               | yes                                        |
| 500 units at ≥ 50 fps (M3-2)     | QA verified | **unverified.** Only figure on record: 44 fps in headless software GL (`playtests/m1-2026-10-11.md`, pre-M3). M2-12 bot metrics have no fps field. | needs QA (M2-19a / M3-6, `?debug` overlay) |

Per-asset detail:

| Asset                                       | Bytes | Triangles | Limit                         | OK  |
| ------------------------------------------- | ----- | --------- | ----------------------------- | --- |
| `public/assets/models/prop-cannon.glb`      | 5468  | 264       | single-instance prop          | yes |
| `public/assets/models/unit-bee.glb`         | 6048  | 220       | ≤ 300 tris/unit               | yes |
| `public/assets/models/unit-hornet.glb`      | 4436  | 142       | ≤ 300 tris/unit               | yes |
| `public/assets/models/unit-queen.glb`       | 6776  | 270       | ≤ 300 tris/unit               | yes |
| `public/assets/models/unit-wasp.glb`        | 4240  | 130       | ≤ 300 tris/unit               | yes |
| `art/models/biome-clover-clover.glb`        | 3296  | 72        | env prop (no per-asset limit) | yes |
| `art/models/biome-clover-fencePost.glb`     | 2352  | 20        | env prop (no per-asset limit) | yes |
| `art/models/biome-clover-flowerLilac.glb`   | 4184  | 124       | env prop (no per-asset limit) | yes |
| `art/models/biome-clover-flowerPink.glb`    | 4180  | 124       | env prop (no per-asset limit) | yes |
| `art/models/biome-clover-flowerWhite.glb`   | 4180  | 124       | env prop (no per-asset limit) | yes |
| `art/models/biome-clover-mushroom.glb`      | 3320  | 73        | env prop (no per-asset limit) | yes |
| `art/models/biome-clover-pebble.glb`        | 2524  | 36        | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-appleTree.glb`    | 3336  | 72        | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-crate.glb`        | 2236  | 12        | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-fencePost.glb`    | 2352  | 20        | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-flowerOrange.glb` | 4180  | 124       | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-mushroom.glb`     | 3280  | 73        | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-pearTree.glb`     | 3332  | 72        | env prop (no per-asset limit) | yes |
| `art/models/biome-orchard-pebble.glb`       | 2524  | 36        | env prop (no per-asset limit) | yes |
| `art/models/prop-nest.glb`                  | 6260  | 382       | single-instance prop          | yes |
| `art/models/skin-bee-blossom.glb`           | 6816  | 260       | ≤ 300 tris/unit               | yes |
| `art/models/skin-bee-classic.glb`           | 6048  | 220       | ≤ 300 tris/unit               | yes |
| `art/models/skin-bee-frost.glb`             | 6616  | 268       | ≤ 300 tris/unit               | yes |
| `art/models/skin-bee-lantern.glb`           | 6192  | 228       | ≤ 300 tris/unit               | yes |
| `art/models/skin-bee-maple.glb`             | 6208  | 230       | ≤ 300 tris/unit               | yes |
| `art/models/skin-bee-sunny.glb`             | 6208  | 232       | ≤ 300 tris/unit               | yes |

## Issues for art (M3-1 sign-off blockers)

1. **No licence or provenance file.** The repo has no `LICENSE`/`COPYING`, no `art/PROVENANCE.md`, and no asset licence. Add `art/PROVENANCE.md` (or `LICENSE-ASSETS`). It should list every shipped and staged asset (or glob) with its generator script / procedural source and the commit. It should also state the licence: "original work of the Hive Surge team, all rights reserved", or CC0 if that's what Mohit wants.
2. **The FTUE SVGs (6 files) have no generator.** Either add a script that emits them (as `make-icons.py` does), or record in the provenance file that they were hand-authored in-repo in PR 012 with no references.
3. **GLB reproducibility isn't verified.** Pin the gltfpack version in the pipeline doc. Then either add a test that re-exports and compares geometry, or have art attach a rebuild log showing `export-assets.ts` reproduces all 26 GLBs.

## Not blocking: track separately

- **FPS at 500 units is unverified headlessly.** Owners: QA M2-19a / M3-6 / M2-19b (real device).

Once issues 1–3 are fixed, M3-1 can be signed off. The IP and metadata scan is already clean.

## Addendum: re-check after PR 042 (art/m3-9-provenance @ `47ee752`, merged `1b801ba`)

1. **Resolved.** `art/PROVENANCE.md` lists all 82 assets (61 in `public/assets`, 21 in `art/models`), each with its size, sha256 (16 hex characters) and generator under `art/tools/`. It also states the licence: **TBD (Mohit decides)**, all rights reserved until then. `tests/provenance.test.ts` enforces it. I checked this by mutating files in a scratch worktree: a changed icon failed 1 test, a removed GLB failed 1, and an unlisted new file failed 2. The suite passed again after restoring.
2. **Resolved.** `art/tools/make-ftue-svgs.py` regenerates all 6 FTUE SVGs byte-identical (`diff -r` is clean).
3. **Resolved.** gltfpack is pinned at 1.3.0 (`GLTFPACK_VERSION` in `src/art/catalog.ts`). I re-ran `art/tools/rebuild-glbs.sh` with npm gltfpack@1.3.0 and got **all 26 GLBs byte-identical**. `tests/glbReexport.test.ts` checks the triangle count, bounds and mean colour of every committed GLB against its procedural source, and fails on orphan GLBs.

- Ogg files: the provenance test only hashes the committed files. It never runs ffmpeg or rebuilds Oggs, so stream-serial differences can't cause flakiness. PROVENANCE says decoded PCM is identical and the serials differ.
- **Still open, not blocking M3-1:** Mohit has to decide the licence. FPS remains with QA.
- Nit: PROVENANCE says `rebuild-glbs.sh` "refuses other versions", but the script only installs the pinned version by default. A `GLTFPACK=` override isn't version-checked (the log does record the version).

**M3-1 signed off. The licence is pending Mohit.**
