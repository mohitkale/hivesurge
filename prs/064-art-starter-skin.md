# PR 064 — art/starter-skin (base: main @ eab648e)

> **Number claimed:** 064, by a one-line INDEX commit on main (`0722f67`, decision 37). This branch first used 058, then
> 060 provisionally; both were taken by other teams (060 went to design/m2-28).

**Why:** PR 051 (`fix/m2-14-m2-25-qa-g4-starter-skin`, merged) makes the Starter Pack grant
`CATALOG.starter_pack.grants.skin = 'starter'`, stored in `save.skins`. `src/art/skins.ts` had no `'starter'` skin, so there
was no art for it.

**Changes**

- `src/art/skins.ts`: new skin **`starter`, "Starter Scout"** (season `core`). It keeps the classic bright honey body
  `#ffd23f` and dark stripes `#3a2412`, plus one accessory: a small teal (team colour) honey-pot backpack with an amber lid
  and a cream badge. Same round bee silhouette, so it passes the skin readability contract. **264 triangles** (limit 300).
- `art/models/skin-bee-starter.glb` (6,628 B, gltfpack 1.3.0). Like the other skins it is not shipped; the game builds
  skins procedurally. `art/tools/rebuild-glbs.sh` gives all 33 GLBs byte-identical.
- `art/PROVENANCE.md` regenerated (89 assets).
- `tests/starterSkin.test.ts`: the `'starter'` id exists and equals the Starter Pack grant, and it is ≤ 300 tris.
  The existing `tests/art.test.ts` budget and readability tests also cover it.
- Fix: `art/tools/rebuild-glbs.sh` looped forever when `GLTFPACK=` pointed at a missing path. It now exits 2.
- `art/tools/skin-sheet.html` → `art/screenshots/skins/starter-skin.png`: 3/4 view, back view, classic for comparison, and
  in-game-angle captures at 24 px and 16 px.

**Not in scope:** the renderer doesn't use owned or equipped skins yet; workers always use the classic geometry. Showing the
starter skin in battle needs an ENG hook (for example, pick `skinGeometry(SKINS.find(id))` for `unit-bee` when the skin is equipped).

**Reviewer:** hivesurge-review · **Status:** open

## Update: skin picker + selection applied in battle (CEO steering)

QA saw the save get `skins: ['starter']` but nothing changed on screen, because no code
read the owned skins. This PR now completes the whole path:

- `SaveData.selectedSkin` (default `'classic'`; parseSave falls back to classic for bad
  values; mergeSaves keeps the newer save's choice).
- `src/art/skinSelect.ts`: `ownedSkins(save.skins)` returns classic plus the owned skins
  that have art. `resolveSkin(selected, owned)` falls back to classic when the skin is
  unowned or unknown.
- Title gets a "Bee skin: <name>" button. The picker lists owned skins, tapping one saves
  it, and ✓ marks the current one.
- `GameScene` takes the resolved skin. Worker bees use `skinGeometry(skin, 0.42)`; the
  starter skin is 264 tris, in the same InstancedMesh with the same wing flap. The
  `unit-bee` GLB swap is skipped for non-classic skins so the skin isn't replaced from the
  2nd battle on.
- Tests: `tests/skinPicker.test.ts` (grant → pickable → selected → render id; survives
  save/load/merge; fallbacks).
- E2E (headless, vite dev, SwiftShader): `art/tools/e2e-skin-picker.mjs <url>`. It seeds a
  post-FTUE save, then picker (classic only) → shop: buy Starter Pack → mock confirm →
  picker (classic + starter) → select starter → saved `selectedSkin: 'starter'` → play →
  `__hsScene.beeSkin.id === 'starter'`, worker geometry 264 tris → launch bees.
  Screenshots: `art/screenshots/skins/e2e-1…5*.png`.
