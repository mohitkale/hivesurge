"""PR 083: x4 crops, deuteranopia versions and before/after sheets for art/screenshots/crowd-lod-far.
Deuteranopia: Machado, Oliveira & Fernandes 2009, severity 1.0, applied in linear RGB."""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw

D = sys.argv[1] if len(sys.argv) > 1 else 'art/screenshots/crowd-lod-far'
M = np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]])

def deut(im):
    a = np.asarray(im.convert('RGB')).astype(np.float64) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    o = np.clip(lin @ M.T, 0, 1)
    s = np.where(o <= 0.0031308, o * 12.92, 1.055 * o ** (1 / 2.4) - 0.055)
    return Image.fromarray((s * 255).round().astype(np.uint8))

for f in sorted(glob.glob(f'{D}/battle-*-farcrop.png')):
    im = Image.open(f).convert('RGB')
    big = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
    big.save(f.replace('-farcrop.png', '-farcrop-x4.png'))
    deut(big).save(f.replace('-farcrop.png', '-farcrop-x4-deuteranopia.png'))
deut(Image.open(f'{D}/model-sheet.png')).save(f'{D}/model-sheet-deuteranopia.png')

def sheet(names, out, title):
    tiles = []
    for n in names:
        a = Image.open(f'{D}/{n}-farcrop-x4.png'); b = Image.open(f'{D}/{n}-farcrop-x4-deuteranopia.png')
        tiles.append((n, a, b))
    w = tiles[0][1].width; h = tiles[0][1].height
    S = Image.new('RGB', (w * 2 + 30, (h + 24) * len(tiles) + 24), '#fff1dc')
    d = ImageDraw.Draw(S); d.text((10, 6), title, fill='#3a2412')
    for i, (n, a, b) in enumerate(tiles):
        y = 24 + i * (h + 24)
        d.text((10, y), f'{n}  |  normal (left), deuteranopia (right)', fill='#3a2412')
        S.paste(a, (10, y + 14)); S.paste(b, (w + 20, y + 14))
    S.save(f'{D}/{out}')

for q in ['high', 'low']:
    sheet([f'battle-{q}-classic-wasp-before', f'battle-{q}-classic-wasp-after'], f'clash-{q}-wasp-before-after.png',
          f'Far-band clash (0.60-0.84 L; bees 0.62-0.71, wasps 0.73-0.82), ?stress=320&quality={q}, crop x4 nearest, sim frozen after spawn. Top: old far wasp (bee shape). Bottom: pinched all-dark far wasp.')
    sheet([f'battle-{q}-{s}-wasp-after' for s in ['classic', 'starter', 'blossom', 'sunny', 'maple', 'frost', 'lantern']],
          f'clash-{q}-skins.png', f'Far-band clash per skin, quality={q}, crop x4 nearest')
