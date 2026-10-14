import { describe, expect, it } from 'vitest';
import { SKINS, skinById, skinGeometry } from '../src/art/skins';
import { applyPurchase } from '../src/platform/entitlements';
import { CATALOG } from '../src/platform/platform';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';
import {
  cycleSkin,
  equipSkin,
  equippedSkinId,
  pickerEntries,
  selectableSkins,
} from '../src/platform/skinSelect';

const KNOWN = SKINS.map((s) => s.id);

describe('QA M2-19a: Starter Pack skin is defined and applied', () => {
  it('every skin granted by a SKU exists in src/art/skins.ts', () => {
    for (const sku of Object.values(CATALOG))
      if (sku.grants.skin) expect(skinById(sku.grants.skin), sku.id).toBeDefined();
    const s = skinById('starter')!;
    expect(s.name).toBe('Starter Gold');
    const g = skinGeometry(s, 0.42);
    expect(g.getAttribute('color')).toBeDefined();
    expect(g.boundingSphere!.radius).toBeGreaterThan(0);
  });

  it('a fresh save renders the classic bee and offers no skin toggle', () => {
    const save = defaultSave();
    expect(equippedSkinId(save, KNOWN)).toBe('classic');
    expect(selectableSkins(save, KNOWN)).toEqual(['classic']);
  });

  it('buying the Starter Pack auto-equips the starter skin', () => {
    const save = defaultSave();
    applyPurchase(save, 'starter_pack');
    expect(save.equippedSkin).toBe('starter');
    expect(equippedSkinId(save, KNOWN)).toBe('starter');
    expect(selectableSkins(save, KNOWN)).toEqual(['classic', 'starter']);
  });

  it('a repeat purchase does not re-equip a skin the player switched off', () => {
    const save = defaultSave();
    applyPurchase(save, 'starter_pack');
    cycleSkin(save, KNOWN);
    applyPurchase(save, 'starter_pack');
    expect(equippedSkinId(save, KNOWN)).toBe('classic');
  });

  it('non-sandbox purchases and other SKUs equip nothing', () => {
    const real = defaultSave();
    applyPurchase(real, 'starter_pack', false);
    expect(real.equippedSkin).toBe('');
    const g = defaultSave();
    applyPurchase(g, 'gems_small');
    expect(equippedSkinId(g, KNOWN)).toBe('classic');
  });

  it('the title toggle cycles classic <-> owned skins', () => {
    const save = defaultSave();
    applyPurchase(save, 'starter_pack');
    expect(cycleSkin(save, KNOWN)).toBe('classic');
    expect(save.equippedSkin).toBe('');
    expect(cycleSkin(save, KNOWN)).toBe('starter');
    expect(save.equippedSkin).toBe('starter');
  });

  it('unowned or unknown equipped ids fall back to classic', () => {
    expect(equippedSkinId({ skins: [], equippedSkin: 'starter' }, KNOWN)).toBe('classic');
    expect(equippedSkinId({ skins: ['ghost'], equippedSkin: 'ghost' }, KNOWN)).toBe('classic');
    expect(selectableSkins({ skins: ['ghost'], equippedSkin: '' }, KNOWN)).toEqual(['classic']);
  });

  it('the equipped skin persists through save parse and merge', () => {
    const save = defaultSave();
    applyPurchase(save, 'starter_pack');
    save.revision = 3;
    const back = parseSave(JSON.stringify(save));
    expect(back.equippedSkin).toBe('starter');
    expect(mergeSaves(back, defaultSave()).equippedSkin).toBe('starter');
    // Old saves without the field load as classic.
    const old = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
    delete old.equippedSkin;
    expect(parseSave(JSON.stringify(old)).equippedSkin).toBe('');
  });
});

describe('Starter Gold art (PR 069)', () => {
  it('stays within the 300-triangle unit budget and keeps the bee wings', () => {
    const g = skinGeometry(skinById('starter')!, 1);
    const tris = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    expect(tris).toBeLessThanOrEqual(300);
    const w = g.getAttribute('aWing');
    let n = 0;
    for (let i = 0; i < w.count; i++) if (w.getX(i) !== 0) n++;
    expect(n).toBeGreaterThan(0);
  });
});

describe('skin picker (PR 069)', () => {
  it('equips an owned skin, saves it as equippedSkin, and ignores unowned ids', () => {
    const save = defaultSave();
    expect(equipSkin(save, 'starter', KNOWN)).toBe('classic');
    expect(save.equippedSkin).toBe('');
    applyPurchase(save, 'starter_pack');
    save.equippedSkin = '';
    expect(selectableSkins(save, KNOWN)).toEqual(['classic', 'starter']);
    expect(equipSkin(save, 'starter', KNOWN)).toBe('starter');
    expect(save.equippedSkin).toBe('starter');
    expect(equipSkin(save, 'ghost', KNOWN)).toBe('starter');
    expect(equipSkin(save, 'classic', KNOWN)).toBe('classic');
    expect(save.equippedSkin).toBe('');
  });
});

describe('Starter Gold reads differently from Classic (QA PR 069 round 2)', () => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => lin(v / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const hue = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
    const mx = Math.max(r, g, b);
    const d = mx - Math.min(r, g, b);
    if (d === 0) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const classic = skinById('classic')!;
  const starter = skinById('starter')!;
  it('body is clearly darker/deeper than Classic (luminance gap >= 0.15)', () => {
    expect(lum(classic.body) - lum(starter.body)).toBeGreaterThanOrEqual(0.15);
  });
  it('stripe is a different colour family (hue gap >= 90 deg)', () => {
    const d = Math.abs(hue(classic.stripe) - hue(starter.stripe));
    expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(90);
  });
  it('still a bee, not a wasp: warm light body, far brighter than the wasp body', () => {
    expect(hue(starter.body)).toBeGreaterThan(30);
    expect(hue(starter.body)).toBeLessThan(60);
    expect(lum(starter.body)).toBeGreaterThan(0.35);
    expect(lum(starter.body) / lum('#2b1636')).toBeGreaterThan(10);
  });
});

describe('skin picker shows locked skins (QA PR 069 round 2)', () => {
  const sources = { starter: 'Starter Pack' };
  it('before purchase: classic owned, Starter Gold locked with its source', () => {
    const save = defaultSave();
    expect(pickerEntries(save, KNOWN, sources)).toEqual([
      { id: 'classic', owned: true, unlock: null },
      { id: 'starter', owned: false, unlock: 'Starter Pack' },
    ]);
    expect(equipSkin(save, 'starter', KNOWN)).toBe('classic');
    expect(save.equippedSkin).toBe('');
  });
  it('after purchase: Starter Gold is owned and no longer locked', () => {
    const save = defaultSave();
    applyPurchase(save, 'starter_pack');
    expect(pickerEntries(save, KNOWN, sources)).toEqual([
      { id: 'classic', owned: true, unlock: null },
      { id: 'starter', owned: true, unlock: null },
    ]);
  });
});
