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

/** Dev overlay is opt-in: `?debug` in the URL (or toggled with F3); hidden by default. */
export function perfEnabledFromUrl(search: string): boolean {
  return new URLSearchParams(search).has('debug');
}

/** `?stress=N` (dev only): spawn N extra units at battle start for perf checks (M2-10/M2-15). */
export function stressCountFromUrl(search: string): number {
  const v = Number(new URLSearchParams(search).get('stress'));
  return Number.isFinite(v) && v > 0 ? Math.min(1000, Math.floor(v)) : 0;
}
