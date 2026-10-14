import { describe, expect, it } from 'vitest';
import { ownedSkins, resolveSkin } from '../src/art/skinSelect';
import { applyPurchase } from '../src/platform/entitlements';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';

describe('bee skin picker (Starter Pack skin shows in battle)', () => {
  it('a fresh save only offers classic and renders classic', () => {
    const s = defaultSave();
    expect(ownedSkins(s.skins).map((k) => k.id)).toEqual(['classic']);
    expect(resolveSkin(s.selectedSkin, s.skins).id).toBe('classic');
  });
  it('granting the Starter Pack makes starter pickable; selecting it renders it', () => {
    const s = defaultSave();
    applyPurchase(s, 'starter_pack');
    expect(ownedSkins(s.skins).map((k) => k.id)).toEqual(['classic', 'starter']);
    s.selectedSkin = 'starter';
    expect(resolveSkin(s.selectedSkin, s.skins).id).toBe('starter');
  });
  it('selection survives save/load and merge', () => {
    const s = defaultSave();
    applyPurchase(s, 'starter_pack');
    s.selectedSkin = 'starter';
    s.revision = 3;
    const back = parseSave(JSON.stringify(s));
    expect(back.selectedSkin).toBe('starter');
    expect(mergeSaves(back, defaultSave()).selectedSkin).toBe('starter');
  });
  it('an unowned or unknown selection falls back to classic', () => {
    expect(resolveSkin('starter', []).id).toBe('classic');
    expect(resolveSkin('nope', ['starter']).id).toBe('classic');
    expect(parseSave(JSON.stringify({ ...defaultSave(), selectedSkin: 7 })).selectedSkin).toBe(
      'classic',
    );
  });
});
