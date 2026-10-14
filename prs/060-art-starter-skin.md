# PR 060 — art/starter-skin (base: main @ eab648e)

> **Number used provisionally.** While this branch was being built, 058 (monetization) and 059 (qa) were claimed on
> main (now at 7673566), so 060 is next. Claiming needs a commit to main, which hivesurge-art does not make. The INDEX owner
> should add: `| 060 | art/starter-skin | hivesurge-art | <tip> | open (claimed) | 060-art-starter-skin.md |`

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
