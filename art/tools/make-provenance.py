"""Writes art/PROVENANCE.md: one row per asset file under public/assets/ and art/models/
(M3-1a). tests/provenance.test.ts fails if any asset is missing, stale or unlisted.
Run: python3 art/tools/make-provenance.py"""
import hashlib, os, subprocess

ROOTS = ['public/assets', 'art/models']
SKIP_EXT = ('.md',)  # docs (e.g. art/models/REBUILD-LOG.md) are not assets

# (path prefix, generator, source/inputs, how verified)
RULES = [
    ('public/assets/icons/', '`art/tools/make-icons.py`', 'Python SVG geometry (no inputs)',
     'regenerates byte-identical'),
    ('public/assets/ftue/', '`art/tools/make-ftue-svgs.py`', 'Python SVG geometry (no inputs)',
     'regenerates byte-identical'),
    ('public/assets/audio/', '`art/tools/make-audio.sh`', 'ffmpeg `aevalsrc` maths → libopus (no samples)',
     'decoded PCM identical; Ogg stream serials differ per run'),
    ('public/assets/skins/', '`art/tools/skin-thumbs.mjs` (renders `skin-thumb.html`)',
     '`src/art/skins.ts` procedural skins → three.js render (SwiftShader), no inputs',
     'visually identical re-render (PNG bytes may differ by renderer)'),
    ('public/assets/models/', '`art/tools/export-assets.ts` (via `rebuild-glbs.sh`)',
     '`src/art/catalog.ts` → `src/art/models.ts`/`skins.ts`/`biomes.ts`; gltfpack 1.3.0',
     'byte-identical rebuild (`art/models/REBUILD-LOG.md`) + `tests/glbReexport.test.ts`'),
    ('art/models/', '`art/tools/export-assets.ts` (via `rebuild-glbs.sh`)',
     '`src/art/catalog.ts` → `src/art/models.ts`/`skins.ts`/`biomes.ts`; gltfpack 1.3.0',
     'byte-identical rebuild (`art/models/REBUILD-LOG.md`) + `tests/glbReexport.test.ts`'),
]


def first_added(path):
    out = subprocess.run(['git', 'log', '--diff-filter=A', '--follow', '--format=%as', '--', path],
                         capture_output=True, text=True).stdout.split()
    return out[-1] if out else 'uncommitted'


def files():
    for root in ROOTS:
        for d, _, fs in os.walk(root):
            for f in fs:
                if not f.endswith(SKIP_EXT):
                    yield os.path.join(d, f)


rows = []
for p in sorted(files()):
    rule = next((r for r in RULES if p.startswith(r[0])), None)
    if rule is None:
        raise SystemExit(f'no provenance rule for {p}: add one to art/tools/make-provenance.py')
    data = open(p, 'rb').read()
    rows.append(f'| `{p}` | {len(data)} | `{hashlib.sha256(data).hexdigest()[:16]}` | {rule[1]} | {first_added(p)} |')

head = f"""# Asset provenance and licence (M3-1a)

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

| Asset group | Generator | Source / inputs | Reproducibility |
| --- | --- | --- | --- |
""" + '\n'.join(f'| `{r[0]}*` | {r[1]} | {r[2]} | {r[3]} |' for r in RULES) + """

FTUE SVGs (`public/assets/ftue/`, PR 012): first written by hand in SVG by hivesurge-art (original work, no
references). Their geometry has since been moved into `art/tools/make-ftue-svgs.py`, which regenerates all 6
byte-identical, so they now have a generator like the icons (M3-1b).

## Files

Date = first commit of the file. sha256 = first 16 hex chars.

| File | Bytes | sha256 | Generator | Added |
| --- | --- | --- | --- | --- |
"""
open('art/PROVENANCE.md', 'w').write(head + '\n'.join(rows) + '\n')
subprocess.run(['npx', 'prettier', '--write', 'art/PROVENANCE.md'], capture_output=True)
print(len(rows), 'assets listed')
