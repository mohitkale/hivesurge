import { describe, expect, it } from 'vitest';
import { SKINS, skinById, skinGeometry } from '../src/art/skins';
import { applyPurchase } from '../src/platform/entitlements';
import { CATALOG } from '../src/platform/platform';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';
import { cycleSkin, equippedSkinId, selectableSkins } from '../src/platform/skinSelect';

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
