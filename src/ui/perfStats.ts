import { UnitKind } from '../sim/types';
import type { World } from '../sim/world';

/** Rolling frame stats for the dev perf overlay (pure, testable). */
export class PerfStats {
  private readonly frames: number[] = [];
  peakCalls = 0;
  peakTriangles = 0;
  lastCalls = 0;
  lastTriangles = 0;

  constructor(private readonly window = 120) {}

  /** Record one frame: its duration and the renderer's draw calls / triangles for that frame. */
  sample(frameMs: number, calls: number, triangles: number): void {
    this.frames.push(frameMs);
    if (this.frames.length > this.window) this.frames.shift();
    this.lastCalls = calls;
    this.lastTriangles = triangles;
    this.peakCalls = Math.max(this.peakCalls, calls);
    this.peakTriangles = Math.max(this.peakTriangles, triangles);
  }

  /** Mean fps over the window (frames / time): real fps, not snapped to vsync steps. */
  get avgFps(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return sum > 0 ? (this.frames.length * 1000) / sum : 0;
  }

  /** Median fps over the window (robust to single hitches). */
  get medianFps(): number {
    if (this.frames.length === 0) return 0;
    const s = [...this.frames].sort((a, b) => a - b);
    const m = s[Math.floor(s.length / 2)];
    return m > 0 ? 1000 / m : 0;
  }

  /** 1% low fps (99th percentile frame time). */
  get lowFps(): number {
    if (this.frames.length === 0) return 0;
    const s = [...this.frames].sort((a, b) => a - b);
    const p = s[Math.min(s.length - 1, Math.floor(s.length * 0.99))];
    return p > 0 ? 1000 / p : 0;
  }
}

/**
 * Dev overlay is opt-in: `?debug` in the URL (or toggled with F3); hidden by default.
 * Dev builds only, like the other QA params: production ignores `?debug` (and game.ts does
 * not even construct the overlay outside `import.meta.env.DEV`, so it is stripped).
 */
export function perfEnabledFromUrl(search: string, isDev: boolean): boolean {
  return isDev && new URLSearchParams(search).has('debug');
}

/**
 * `?stress=N` (dev only): keep about N extra units alive for perf checks (M2-10/M2-15).
 * Production ignores it: game.ts only reads it under `import.meta.env.DEV`, so this and
 * spawnStress are stripped from production builds.
 */
export function stressCountFromUrl(search: string, isDev: boolean): number {
  if (!isDev) return 0;
  const v = Number(new URLSearchParams(search).get('stress'));
  return Number.isFinite(v) && v > 0 ? Math.min(1000, Math.floor(v)) : 0;
}

/**
 * Dev `?stress=N`: keep about N units alive (half bees from the hive, half wasps from the nest),
 * topping up every frame because units constantly destroy each other.
 */
export function spawnStress(w: World, n: number): void {
  const half = w.level.laneWidth / 2 - 0.5;
  let k = w.stats.fired + w.wasps.count;
  while (w.bees.count + w.wasps.count < n) {
    const x = -half + ((k++ * 0.618) % 1) * 2 * half;
    const beeShort = w.bees.count < n / 2;
    const ok = beeShort
      ? w.bees.spawn(UnitKind.Worker, x, 1.2 + (k % 7) * 0.4)
      : w.wasps.spawn(UnitKind.Wasp, x, w.level.laneLength - 1 - (k % 7) * 0.4);
    if (ok < 0) break;
  }
}
