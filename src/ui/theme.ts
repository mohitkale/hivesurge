/**
 * Hive Surge design system. Single source of truth for colour, type and
 * spacing; applied to CSS custom properties at boot and read by the renderer.
 */
export const COLORS = {
  honey: '#ffc83d',
  honeyDeep: '#f2a516',
  teal: '#2ec4b6',
  tealDeep: '#1f8f86',
  plum: '#6b2d8c',
  plumDeep: '#4a1d63',
  orange: '#ff8a3d',
  ink: '#2a1838',
  cream: '#fff8ec',
  sky: '#ffd9a8',
  grass: '#7cc46a',
  danger: '#e2557a',
  success: '#5fb84a',
  // Gate colours: one hue per kind, each >= 3:1 (WCAG) against every lane colour
  // (tests/gate-contrast.test.ts). Never reuse team teal for a gate.
  gateAdd: '#1a47b8', // blue
  gateMul: '#5b1fb0', // violet
  gateTrap: '#a10f2a', // crimson
} as const;

/**
 * Colour-blind-safe alternatives (Okabe–Ito based). Gate types also differ by
 * symbol (+, ×, −) so meaning never depends on colour alone.
 */
export const CB_COLORS = {
  ...COLORS,
  teal: '#0072b2', // multiply gate: blue
  success: '#009e73', // add gate: bluish green
  danger: '#d55e00', // trap: vermillion
  plum: '#cc79a7',
  orange: '#e69f00',
  gateAdd: '#00508a', // Okabe-Ito blue, darkened for 3:1 on grass
  gateMul: '#7a2a5e', // Okabe-Ito reddish purple, darkened
  gateTrap: '#8a3800', // Okabe-Ito vermillion, darkened
} as const;

export type Palette = { [K in keyof typeof COLORS]: string };

/** Modular type scale (1.25) in px. */
export const TYPE = { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 38, hero: 46 } as const;
/** 4px spacing grid. */
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const;
export const RADIUS = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const MOTION = { fast: 120, base: 180, slow: 700 } as const;

export function palette(colorBlind: boolean): Palette {
  return colorBlind ? CB_COLORS : COLORS;
}

export function applyTheme(root: HTMLElement, colorBlind = false): void {
  const p = palette(colorBlind);
  for (const [k, v] of Object.entries(p)) root.style.setProperty(`--${kebab(k)}`, v);
  for (const [k, v] of Object.entries(TYPE)) root.style.setProperty(`--fs-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(SPACE)) root.style.setProperty(`--sp-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(RADIUS)) root.style.setProperty(`--r-${k}`, `${v}px`);
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}
