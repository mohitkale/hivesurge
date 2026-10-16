import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * QA BUG-01 / STATUS decision 43: HUD text (meter labels, FTUE prompt, level banner, hint) sits
 * on the --hud-plate backplate, and the hive number colour clears AA on its white chip.
 * WCAG AA: >= 4.5:1 normal text, >= 3:1 large text (>= 24px, or >= 18.66px bold).
 */
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

function luminance(h: string): number {
  const ch = parseHex(h).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function parseHex(h: string): number[] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Plate rgba composited over a backdrop colour. */
function over(rgba: [number, number, number, number], bg: string): string {
  const b = parseHex(bg);
  const [r, g, bl, a] = rgba;
  return hex(r * a + b[0] * (1 - a), g * a + b[1] * (1 - a), bl * a + b[2] * (1 - a));
}

// Backdrops QA sampled (sky 255,217,168; honey bar 243,176,34; FTUE bg 233,168,107) plus the
// worst cases (white, and the light biome lanes) the plate can sit on.
const BACKDROPS = ['#ffd9a8', '#f3b022', '#e9a86b', '#ffffff', '#ffc83d', '#bfe3a0', '#e6d8f5'];

describe('HUD contrast (QA BUG-01)', () => {
  const m = css.match(/--hud-plate:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  it('defines the HUD backplate', () => expect(m).not.toBeNull());
  const plate = m!.slice(1).map(Number) as [number, number, number, number];

  for (const sel of ['.meter-label', '.ftue-prompt', '.level-banner', '.hint']) {
    it(`${sel} uses the backplate and white text`, () => {
      const block = css.match(new RegExp(`\\n\\${sel} \\{([^}]*)\\}`))![1];
      expect(block).toContain('background: var(--hud-plate)');
      expect(block).toContain('color: #fff');
    });
  }

  it('white text on the plate is >= 4.5:1 on every backdrop', () => {
    for (const bg of BACKDROPS)
      expect(contrast('#ffffff', over(plate, bg)), bg).toBeGreaterThanOrEqual(4.5);
  });

  it('meter numbers on their white chip are >= 4.5:1', () => {
    const mine = css.match(/\.meter\.mine \.meter-num \{[^}]*color: (#[0-9a-f]{6})/)![1];
    const enemy = '#6b2d8c'; // var(--plum)
    expect(contrast(mine, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(enemy, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
