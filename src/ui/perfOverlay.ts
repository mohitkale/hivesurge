import type { PerfStats } from './perfStats';

/** Minimal fixed-position text panel; updated at most 4×/s to stay cheap. */
export class PerfOverlay {
  readonly el: HTMLElement;
  private acc = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'perf-overlay';
    this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);
  }

  set visible(v: boolean) {
    this.el.style.display = v ? '' : 'none';
  }

  get visible(): boolean {
    return this.el.style.display !== 'none';
  }

  /**
   * fix/perf-lowend-2: real fps to one decimal (mean over the window; the median snaps to
   * vsync steps 60/30/20/15...), tier, vertices and triangles, on two lines.
   */
  update(
    dt: number,
    s: PerfStats,
    units: number,
    pixelRatio: number,
    tier = '',
    vertices: () => number = () => 0,
  ): void {
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    this.el.textContent = formatPerf(s, units, pixelRatio, tier, vertices());
    this.el.dataset.calls = String(s.lastCalls);
    this.el.dataset.peakCalls = String(s.peakCalls);
    this.el.dataset.fps = s.avgFps.toFixed(1);
    this.el.dataset.units = String(units);
    this.el.dataset.tier = tier;
  }
}

const k = (n: number) => `${(n / 1000).toFixed(1)}k`;

export function formatPerf(
  s: PerfStats,
  units: number,
  pixelRatio: number,
  tier: string,
  vertices: number,
): string {
  return (
    `fps ${s.avgFps.toFixed(1)} (med ${s.medianFps.toFixed(1)}, 1% ${s.lowFps.toFixed(1)}) · ${tier} · dpr ${pixelRatio.toFixed(2)}\n` +
    `calls ${s.lastCalls} (peak ${s.peakCalls}) · tris ${k(s.lastTriangles)} (peak ${k(s.peakTriangles)}) · verts ${k(vertices)} · units ${units}`
  );
}
