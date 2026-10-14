# Asset provenance and licence (M3-1a)

Every file under `public/assets/` and `art/models/` is listed below. **`tests/provenance.test.ts` fails if an
asset is missing from this file, if its size/sha256 no longer match, or if a listed file no longer exists.**
Regenerate with `python3 art/tools/make-provenance.py` after changing an asset.

- **Author:** hivesurge-art (Hive Surge art lead bot), for Mohit K. All assets are original, made from code in this
  repo. No third-party assets, samples, fonts, textures or reference images were used (clean-room; see
  `prs/REVIEW-m3-clean-room.md`).
- **Tools:** Python 3, ffmpeg + libopus, Node + tsx, three.js (geometry only), gltfpack **1.3.0** (pinned in
  `src/art/catalog.ts`; `art/tools/rebuild-glbs.sh` exits 2 for any other version, including a `GLTFPACK=` override).
- **Licence:** **TBD (Mohit decides).** Until then, all rights reserved by the project owner.

## Generators

| Asset group              | Generator                                            | Source / inputs                                                                   | Reproducibility                                                                    |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `public/assets/icons/*`  | `art/tools/make-icons.py`                            | Python SVG geometry (no inputs)                                                   | regenerates byte-identical                                                         |
| `public/assets/ftue/*`   | `art/tools/make-ftue-svgs.py`                        | Python SVG geometry (no inputs)                                                   | regenerates byte-identical                                                         |
| `public/assets/audio/*`  | `art/tools/make-audio.sh`                            | ffmpeg `aevalsrc` maths → libopus (no samples)                                    | decoded PCM identical; Ogg stream serials differ per run                           |
| `public/assets/models/*` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | `src/art/catalog.ts` → `src/art/models.ts`/`skins.ts`/`biomes.ts`; gltfpack 1.3.0 | byte-identical rebuild (`art/models/REBUILD-LOG.md`) + `tests/glbReexport.test.ts` |
| `art/models/*`           | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | `src/art/catalog.ts` → `src/art/models.ts`/`skins.ts`/`biomes.ts`; gltfpack 1.3.0 | byte-identical rebuild (`art/models/REBUILD-LOG.md`) + `tests/glbReexport.test.ts` |

FTUE SVGs (`public/assets/ftue/`, PR 012): first written by hand in SVG by hivesurge-art (original work, no
references). Their geometry has since been moved into `art/tools/make-ftue-svgs.py`, which regenerates all 6
byte-identical, so they now have a generator like the icons (M3-1b).

## Files

Date = first commit of the file. sha256 = first 16 hex chars.

| File                                        | Bytes | sha256             | Generator                                            | Added      |
| ------------------------------------------- | ----- | ------------------ | ---------------------------------------------------- | ---------- |
| `art/models/biome-clover-bush.glb`          | 3904  | `e83acecd4f55176e` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-11 |
| `art/models/biome-clover-clover.glb`        | 3296  | `0f5d7de971b3b829` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-clover-dandelion.glb`     | 2832  | `abff9b5d7431c2a7` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-11 |
| `art/models/biome-clover-fencePost.glb`     | 2352  | `6d77d0ed2c6aa913` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-clover-flowerLilac.glb`   | 4184  | `213d6a9157b396dd` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-clover-flowerPink.glb`    | 4180  | `a8bd8786a9c323e7` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-clover-flowerWhite.glb`   | 4180  | `ba59689db5d188ce` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-clover-hill.glb`          | 2580  | `6538ed956b3f9ae6` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-11 |
| `art/models/biome-clover-mushroom.glb`      | 3320  | `524d1cbcfdef0d8c` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-clover-pebble.glb`        | 2524  | `7a43db9f37d33d4a` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-appleTree.glb`    | 3336  | `317b8d22c52f08c8` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-crate.glb`        | 2236  | `e91c81e4923165ed` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-fencePost.glb`    | 2352  | `8552f509037448b7` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-flowerOrange.glb` | 4180  | `d0f23224b82e2f03` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-hayBale.glb`      | 2392  | `4754759481ff3f8b` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-11 |
| `art/models/biome-orchard-hedge.glb`        | 3904  | `a9dbd623a5ae9ddc` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-11 |
| `art/models/biome-orchard-hill.glb`         | 2580  | `23529b7c159d3d15` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-11 |
| `art/models/biome-orchard-mushroom.glb`     | 3280  | `14605c631175de1d` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-pearTree.glb`     | 3332  | `51faa193ef3fe30b` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/biome-orchard-pebble.glb`       | 2524  | `96311ac6d8f15625` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/prop-nest.glb`                  | 6260  | `06a8c63f25b22758` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-blossom.glb`           | 6816  | `2d09a051099ac421` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-classic.glb`           | 6048  | `75ddb383481507b2` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-frost.glb`             | 6616  | `8228196e75818103` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-lantern.glb`           | 6192  | `aabd4753f24001a5` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-maple.glb`             | 6208  | `08a8fc3eceb74a2c` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-starter.glb`           | 6340  | `ac32ed7481662947` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `art/models/skin-bee-sunny.glb`             | 6208  | `e5c29c9ad9a832cc` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `public/assets/audio/fire.ogg`              | 677   | `32c94ec7bc5ce468` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/hum.ogg`               | 14096 | `aca92268c82cb2cd` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/hurt.ogg`              | 1190  | `e81df59984b10582` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/lose.ogg`              | 7004  | `8783163934fb3fa0` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/music.ogg`             | 98548 | `7681488d5099900c` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/pop.ogg`               | 823   | `4e1b1dfd7e878d33` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/queen.ogg`             | 2706  | `df80f876cabd3c99` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/thud.ogg`              | 1181  | `46d8e8b715beeb98` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/audio/win.ogg`               | 7670  | `1ff0ba41a93a1c46` | `art/tools/make-audio.sh`                            | 2026-10-10 |
| `public/assets/ftue/aim-line.svg`           | 631   | `5085e356885b1612` | `art/tools/make-ftue-svgs.py`                        | 2026-10-10 |
| `public/assets/ftue/finger.svg`             | 524   | `6909ec94c481d816` | `art/tools/make-ftue-svgs.py`                        | 2026-10-10 |
| `public/assets/ftue/gate-arrow.svg`         | 234   | `c661b797d380b131` | `art/tools/make-ftue-svgs.py`                        | 2026-10-10 |
| `public/assets/ftue/gate-glow.svg`          | 568   | `bd13dd94c9de4dbf` | `art/tools/make-ftue-svgs.py`                        | 2026-10-10 |
| `public/assets/ftue/prompt-plate.svg`       | 372   | `e07ea8fe562164a8` | `art/tools/make-ftue-svgs.py`                        | 2026-10-10 |
| `public/assets/ftue/tap-ring.svg`           | 398   | `745ae4c36173383c` | `art/tools/make-ftue-svgs.py`                        | 2026-10-10 |
| `public/assets/icons/ad-video.svg`          | 305   | `0c1c93c1e0f2b60c` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/bee.svg`               | 723   | `48b256600e314495` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/boost.svg`             | 248   | `556842fcbd88997d` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/calendar.svg`          | 603   | `29039e302e261750` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/cannon.svg`            | 461   | `47a5be7704c739bf` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/check.svg`             | 359   | `89b520acee2a99b1` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/clock.svg`             | 357   | `c57c5bfbc1e86c03` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/close.svg`             | 331   | `65081cc54630328a` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/clover.svg`            | 611   | `76854d8c63985e1a` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/coin.svg`              | 412   | `d3357b7d5b44d960` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/crown.svg`             | 302   | `20c25e2580f42991` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/flower.svg`            | 995   | `2ea1895d8282fd90` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/gate-add.svg`          | 347   | `36f8c4edd32f73d0` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/gate-multiply.svg`     | 358   | `0d1b8ec3cf38e9db` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/gate-trap.svg`         | 339   | `4665436746ab6065` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/gem.svg`               | 374   | `6844128bc8e7ef1a` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/gift.svg`              | 591   | `147cd48e7d7ded07` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/heart.svg`             | 286   | `aa59721750706a3b` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/hive.svg`              | 456   | `4fe0b11b638fafe0` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/home.svg`              | 494   | `45aae9e1efb9a9cf` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/honey.svg`             | 353   | `91711075c6505146` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/hornet.svg`            | 704   | `afe9d50fdd150b2a` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/lock.svg`              | 435   | `4ad3f586f8c52a67` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/map.svg`               | 412   | `cbca931363f73455` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/music.svg`             | 486   | `baf78ce61852d9e5` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/nest.svg`              | 386   | `6429234423572560` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/pause.svg`             | 325   | `6115aaff275e75be` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/play.svg`              | 364   | `4fb4f4eaefbc47e8` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/queen.svg`             | 858   | `19a8c5340d23967b` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/season-pass.svg`       | 579   | `b0ae208aeeb5420f` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/settings.svg`          | 513   | `0bb0063d71915a57` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/share.svg`             | 608   | `45eebedee81dc61c` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/shield.svg`            | 392   | `2248cac3502845cc` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/shop.svg`              | 369   | `5e0f9dc91ec0d250` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/skin.svg`              | 812   | `698fdd64ecca54d6` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/sound-off.svg`         | 365   | `1de04cd1c0e44c82` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/sound-on.svg`          | 393   | `794397e7d83f25a9` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/star.svg`              | 322   | `d2e0d54eebbf0dd2` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/trophy.svg`            | 631   | `2bc6477c01e0844f` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/unlock.svg`            | 435   | `edf4f34ac334669a` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/icons/wasp.svg`              | 588   | `bc71713242ab9ff2` | `art/tools/make-icons.py`                            | 2026-10-10 |
| `public/assets/models/prop-cannon.glb`      | 5468  | `a3ce8aa54f57a2be` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `public/assets/models/unit-bee.glb`         | 6048  | `75ddb383481507b2` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `public/assets/models/unit-hornet.glb`      | 4436  | `9da99e0ad4e7aab0` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `public/assets/models/unit-queen.glb`       | 6776  | `e6e84a6198429876` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
| `public/assets/models/unit-wasp.glb`        | 4240  | `ff97f7d2f41bff9a` | `art/tools/export-assets.ts` (via `rebuild-glbs.sh`) | 2026-10-10 |
