"""Compose skin-battle-compare.mjs crops: rows high/low, columns Classic | skin (QA PR 069)."""
import sys
from PIL import Image, ImageDraw

skin, out = (sys.argv[1:] + ['starter', 'art/screenshots/skins/compare'])[:2]
cells = [[Image.open(f'{out}/{skin}-{q}-{e}.png') for e in ('classic', skin)] for q in ('high', 'low')]
w, h = cells[0][0].size
sheet = Image.new('RGB', (w * 2 + 30, (h + 26) * 2), '#2a1838')
d = ImageDraw.Draw(sheet)
for r, (q, row) in enumerate(zip(('high', 'low (unlit)'), cells)):
    for c, img in enumerate(row):
        x, y = c * (w + 30), r * (h + 26)
        sheet.paste(img, (x, y + 22))
        d.text((x + 6, y + 5), f"{('Classic', skin)[c]} - {q}", fill='white')
sheet.save(f'{out}/{skin}-vs-classic-battle.png')
print(f'{out}/{skin}-vs-classic-battle.png')
