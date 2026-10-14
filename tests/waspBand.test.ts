import { describe, expect, it } from 'vitest';
import { ART } from '../src/art/palette';
import { COLORS } from '../src/ui/theme';

/** WCAG relative luminance / contrast (same maths as tests/gate-contrast.test.ts). */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB hue in degrees. */
function hue(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const hueGap = (a: string, b: string) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};
const TRAP = '#a10f2a';

describe('wasp band (survives the unlit low tier; DES-approved)', () => {
  it('the trap gate colour this test guards against is still #a10f2a', () => {
    expect(COLORS.gateTrap.toLowerCase()).toBe(TRAP);
  });
  it('is a red-orange, clearly apart from bee yellow in hue', () => {
    expect(hue(ART.waspBand)).toBeGreaterThanOrEqual(10);
    expect(hue(ART.waspBand)).toBeLessThanOrEqual(25); // red-orange, never golden/friendly
    expect(hueGap(ART.waspBand, ART.beeBody)).toBeGreaterThanOrEqual(20);
  });
  it('is clearly different from the trap gate crimson', () => {
    expect(hueGap(ART.waspBand, TRAP)).toBeGreaterThanOrEqual(25);
    expect(contrast(ART.waspBand, TRAP)).toBeGreaterThanOrEqual(3);
  });
  it('is brighter than before (#ff7a1a) and pops on the dark wasp body', () => {
    expect(luminance(ART.waspBand)).toBeGreaterThan(luminance('#ff7a1a'));
    expect(contrast(ART.waspBand, ART.waspBody)).toBeGreaterThanOrEqual(5);
  });
});
