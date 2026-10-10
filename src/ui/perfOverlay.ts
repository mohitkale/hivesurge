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

  update(dt: number, s: PerfStats, units: number, pixelRatio: number): void {
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    this.el.textContent =
      `fps ${s.medianFps.toFixed(0)} (1% ${s.lowFps.toFixed(0)}) · ` +
      `calls ${s.lastCalls} (peak ${s.peakCalls}) · ` +
      `tris ${(s.lastTriangles / 1000).toFixed(1)}k (peak ${(s.peakTriangles / 1000).toFixed(1)}k) · ` +
      `units ${units} · dpr ${pixelRatio.toFixed(2)}`;
    this.el.dataset.calls = String(s.lastCalls);
    this.el.dataset.peakCalls = String(s.peakCalls);
    this.el.dataset.fps = s.medianFps.toFixed(1);
    this.el.dataset.units = String(units);
  }
}
