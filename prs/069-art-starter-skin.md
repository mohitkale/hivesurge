# PR 069 — art/starter-skin (base: main @ db68b38)

Number 069 was assigned by review, which is fixing INDEX; this branch did not touch INDEX. It was
rebased onto main after eng's PR 064 (`fix/m2-19a-starter-skin`), which added the `'starter'` skin
(Starter Gold), `equippedSkin`, purchase auto-equip and skinned worker bees in battle. The pre-rebase
history is kept at `backup/art-starter-skin-pre-rebase-069`. My duplicate `starter` entry and my
`selectedSkin` field were dropped, and `equippedSkin` is used everywhere with eng's save, merge and
fallback rules.

## Commits

1. **art(skins): final Starter Gold look.** The id, name and amber/brown colours are unchanged. It
   adds a team-teal satchel with an amber jar lid on the back and a honey-drop badge on the head.
   It is the same body, stripes and wings as Classic, so it still reads as a bee at 16–24 px
   (`art/screenshots/skins/starter-skin.png`: 3/4 view, back view, Classic for comparison, 24/16 px).
   - 272 tris (budget 300; the test checks the budget and that the wings are kept).
   - `art/models/skin-bee-starter.glb` re-exported; all 33 GLBs rebuild byte-identical.
   - `art/PROVENANCE.md` regenerated.
   - Also: `rebuild-glbs.sh` no longer loops forever when `GLTFPACK` points at a missing file.
2. **feat(skins): skin picker.** The title-screen "Bee skin" button (shown once a skin is owned)
   now opens a picker that lists the owned skins with ✓ on the equipped one. Tapping a skin equips
   it via the new `equipSkin()` in `src/platform/skinSelect.ts` (only selectable ids), saves it, and
   rebuilds the scene. It replaces eng's cycle toggle; `cycleSkin` stays for eng's tests. The
   per-skin worker bees in battle and the GLB-swap skip are eng's code on main and are unchanged.
   - Tests: `tests/starterSkin.test.ts` adds picker equip/unowned/classic cases.
   - E2E: `art/tools/e2e-skin-picker.mjs <dev-url>`. It seeds a post-FTUE save, then: title (no
     skin button) → shop: buy Starter Pack → OK → picker (Classic + Starter Gold, auto-equipped) →
     pick Classic → pick Starter Gold → saved `equippedSkin: 'starter'` → play →
     `__hsScene.beeSkin.id === 'starter'`, worker mesh 272 tris → bees launched.
   - Screenshots: `art/screenshots/skins/e2e-1-title-before`, `e2e-2-picker-owned`,
     `e2e-3a-picker-classic`, `e2e-3-picker-selected`, `e2e-4-title`, `e2e-5-battle-starter` (.png).
