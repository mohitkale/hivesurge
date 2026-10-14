# PR (number pending): fix/m2-19a-starter-skin

Number not claimed yet: `main` is checked out at `/tmp/rev-merge` (with uncommitted INDEX/review edits), so the temporary-worktree claim wasn't forced. Rename to `prs/NNN-fix-m2-19a-starter-skin.md` once a number is claimed (next free on main `57a32a0`: 064).

QA M2-19a (`playtests/m2-19a-2026-10-14.md` on `qa/m2-19a-emulation-perf`), Starter Pack re-check: the coins, gems and no-ads grants passed, but the skin failed. `save.ts` adds `'starter'` to the owned skins, `src/art/skins.ts` had no `'starter'` skin, and no UI showed it. Base: main `57a32a0`.

## Changes

- `src/art/skins.ts`: new `starter` skin, "Starter Gold" (`core`). It's a procedural placeholder: a deeper amber body (`#ffc93c`), dark stripes (`#3a1c06`) and a honey-drop badge on the head (two octahedra). It passes the readability contract (light body, dark stripes) and stays under the 300-triangle cap. Also adds `DEFAULT_SKIN` and `skinById()`.
- `src/platform/skinSelect.ts` (pure, no three.js): `equippedSkinId`, `selectableSkins`, `cycleSkin`. An equipped id that isn't owned or isn't defined falls back to classic.
- `SaveData.equippedSkin` (`''` = classic). Old saves load as classic. A merge keeps the newer save's choice, and owned skins stay sticky as before.
- `applyPurchase`: a newly granted skin is auto-equipped. Buying again doesn't re-equip a skin the player switched off. Non-sandbox purchases still grant no skin.
- Title screen: a "Bee skin: <name>" toggle appears only once the player owns a skin. It cycles Classic ↔ owned skins and rebuilds the scene. A purchase that auto-equips rebuilds the scene right away.
- `GameScene` takes the skin. A non-classic skin renders the procedural skinned bee for workers, and the M3-5 GLB swap skips `unit-bee` while it's equipped, because there's no GLB variant per skin at runtime yet.
- `art/models/skin-bee-starter.glb`: exported with the pinned gltfpack (`rebuild-glbs.sh`: all 33 GLBs byte-identical). Also updated `art/PROVENANCE.md` (`make-provenance.py`) and `art/tools/models.json`.

## For art (replace later)

- The final Starter Gold look: body/stripe colours and the badge accessory in `src/art/skins.ts` are eng placeholders. Re-export `skin-bee-starter.glb` and provenance after any change.
- A runtime GLB for skinned workers. Today a skinned bee always uses procedural geometry in battle, and only `unit-bee.glb` (classic) is loaded.
- A shop or title thumbnail for the skin. The toggle is text only for now.
- A real skins screen if more skins become ownable. This PR ships the minimal toggle only.

## Tests

`tests/starterSkin.test.ts` (8): every SKU skin exists in `SKINS`; the starter geometry builds with vertex colours; a fresh save is classic with no toggle; a purchase auto-equips; a repeat purchase doesn't re-equip; non-sandbox purchases and other SKUs equip nothing; the toggle cycles; unowned or unknown ids fall back to classic; `equippedSkin` survives parse and merge, and old saves load as classic. Existing `art.test.ts` (readability, triangles), `glbReexport.test.ts` and `provenance.test.ts` cover the new skin and GLB.

## Checks

ESLint ok (10.12.0, worktree npm ci) · prettier fails only on 3 files already unformatted on main 57a32a0 (playtests/m2-12/results/post-m2-26/sim-sessions.json, playtests/m2-19a-2026-10-14.md, prs/059-qa-m2-19a-emulation-perf.md), none touched here · tests 270/270 · build ok · size budget: initial JS 2.36 KiB gzip, dist 909.57 KiB. Logs: `/tmp/s1-*.txt`.

Reviewer: `hivesurge-review` · Status: `awaiting review + playtest` (QA: buy the Starter Pack in the sandbox shop; the title bees and battle workers turn Starter Gold, and the toggle switches back to Classic).
