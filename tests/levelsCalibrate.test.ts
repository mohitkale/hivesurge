// M7-1 calibration (skipped unless CAL=1): `npm run levels:calibrate` rewrites
// src/levels/genTuning.json. CAL_ONLY=7,12 recalibrates just those levels.
import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { AUTHORED, generateLevel, levelBand, VALIDATED } from '../src/levels/campaign';
import { validateLevel } from '../src/levels/validate';

const FILE = 'src/levels/genTuning.json';
const TARGET = 22; // aim-bot seconds left

function calibrate(n: number): number[] | null {
  // Feedback round 4: some layouts snowball (win fast or lose); re-roll the layout then.
  for (const variant of [0, 1, 2, 3, 4, 5]) {
    const t = calibrateVariant(n, variant);
    if (t) return variant ? [...t, variant] : t;
  }
  return null;
}

function calibrateVariant(n: number, variant: number): [number, number] | null {
  const band = levelBand(n);
  // Lower wave size only when the hive falls even with a small nest.
  for (const wave of [100, 90, 80, 70, 60, 50]) {
    let lo = 30;
    let hi = 450; // feedback round 4 layouts multiply more than the M7-1 templates
    let pct = 100;
    let best: { pct: number; tl: number } | null = null;
    let hiveFell = false;
    for (let it = 0; it < 8; it++) {
      const v = validateLevel(generateLevel(n, [pct, wave, variant]), band);
      const won = v.aim.outcome === 'won';
      const tl = won ? v.aim.timeLeft : -1;
      if (!won && v.aim.timeLeft > 0 && pct <= 40) hiveFell = true;
      if (v.ok && (!best || Math.abs(tl - TARGET) < Math.abs(best.tl - TARGET))) best = { pct, tl };
      if ((best && Math.abs(best.tl - TARGET) < 5) || hiveFell) break;
      if (tl < TARGET) hi = pct;
      else lo = pct;
      pct = Math.round((lo + hi) / 2);
    }
    if (best) return [best.pct, wave];
  }
  return null;
}

test.skipIf(!process.env.CAL)(
  'calibrate generated levels',
  () => {
    const table = JSON.parse(readFileSync(FILE, 'utf8')) as number[][];
    const only = process.env.CAL_ONLY?.split(',').map(Number);
    const count = Number(process.env.CAL_COUNT ?? VALIDATED);
    for (let n = AUTHORED + 1; n <= AUTHORED + count; n++) {
      if (only && !only.includes(n)) continue;
      const t = calibrate(n);
      console.log(n, levelBand(n), t ? t.join('/') : 'NO FIT');
      if (t) table[n - AUTHORED - 1] = t;
    }
    if (!process.env.CAL_DRY) writeFileSync(FILE, JSON.stringify(table) + '\n');
  },
  3_600_000,
);
