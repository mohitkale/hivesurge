import { describe, expect, it } from 'vitest';
import { BIOMES } from '../src/art/biomes';
import { GRASS } from '../src/render/textures';
import { CB_COLORS, COLORS } from '../src/ui/theme';

/** WCAG 2.x relative luminance of an sRGB hex colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LANES = [...GRASS, ...Object.values(BIOMES).flatMap((b) => [b.lane, b.laneAlt])];
const GATES = (p: typeof COLORS | typeof CB_COLORS) => ({
  add: p.gateAdd,
  mul: p.gateMul,
  trap: p.gateTrap,
});

describe('gate colours (DES M3-1 change 1)', () => {
  it('known WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
  for (const [name, pal] of [
    ['default', COLORS],
    ['colour-blind', CB_COLORS],
  ] as const) {
    it(`${name}: every gate >= 3:1 against every lane colour`, () => {
      for (const [kind, c] of Object.entries(GATES(pal)))
        for (const lane of LANES)
          expect(contrast(c, lane), `${kind} ${c} on ${lane}`).toBeGreaterThanOrEqual(3);
    });
    it(`${name}: gate colours are distinct and never the team teal`, () => {
      const g = Object.values(GATES(pal));
      expect(new Set(g).size).toBe(3);
      for (const c of g) {
        expect(c).not.toBe(COLORS.teal);
        expect(c).not.toBe(CB_COLORS.teal);
      }
    });
    it(`${name}: white label text >= 4.5:1 on every gate plate`, () => {
      for (const c of Object.values(GATES(pal)))
        expect(contrast('#ffffff', c)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
