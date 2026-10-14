import { describe, expect, it } from 'vitest';
import { triangles } from '../src/art/models';
import { SKINS, skinGeometry } from '../src/art/skins';
import { CATALOG } from '../src/platform/platform';

describe("Starter Pack bee skin ('starter')", () => {
  const skin = SKINS.find((s) => s.id === 'starter');
  it('exists and matches the id the Starter Pack grants', () => {
    expect(skin).toBeDefined();
    expect(CATALOG.starter_pack.grants.skin).toBe(skin!.id);
  });
  it('stays within the 300-triangle unit budget', () => {
    expect(triangles(skinGeometry(skin!))).toBeLessThanOrEqual(300);
  });
});
