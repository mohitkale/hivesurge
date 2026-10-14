/**
 * M2-28d aim-trace recorder (format: docs/design/aim-trace-format.md). Lazy-loaded by game.ts
 * only when `?trace=aim` is set (see aimTraceFlag.ts).
 */
export const AIM_TRACE_FORMAT = 'hivesurge.aimTrace';
export const AIM_TRACE_VERSION = 1;
/** Minimum gap between aim samples (about 30 Hz). Unchanged aim x is never re-sampled. */
export const AIM_SAMPLE_MS = 33;

export type LaunchKind = 'bee' | 'queen';
export type TraceOutcome = 'won' | 'lost';

export interface AimTraceJson {
  format: typeof AIM_TRACE_FORMAT;
  version: typeof AIM_TRACE_VERSION;
  level: string;
  seed: number | null;
  viewport: { w: number; h: number; dpr: number };
  startedAt: string;
  /** [ms since battle start, aim x in lane units (2 decimals)] */
  aim: [number, number][];
  /** [ms, kind, count]: bee launches are grouped per sim step. */
  launches: [number, LaunchKind, number][];
  /** One entry per battle end (a revive continues the battle and can add a second). */
  results: { t: number; outcome: TraceOutcome; nestLeftPct: number; hiveLeft: number }[];
}

/** The world fields the recorder reads after every sim step. */
export interface TraceWorld {
  time: number;
  cannonX: number;
  stats: { fired: number; queens: number };
}

export interface TraceMeta {
  level: string;
  seed?: number | null;
  viewport: { w: number; h: number; dpr: number };
  startedAt?: string;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export class AimTrace {
  private readonly data: AimTraceJson;
  private lastSampleT = -Infinity;
  private lastX = NaN;
  private fired = 0;
  private queens = 0;

  constructor(meta: TraceMeta, w?: TraceWorld) {
    this.data = {
      format: AIM_TRACE_FORMAT,
      version: AIM_TRACE_VERSION,
      level: meta.level,
      seed: meta.seed ?? null,
      viewport: meta.viewport,
      startedAt: meta.startedAt ?? new Date().toISOString(),
      aim: [],
      launches: [],
      results: [],
    };
    if (w) {
      this.fired = w.stats.fired;
      this.queens = w.stats.queens;
    }
  }

  /** Aim x at time tMs. Dedupes unchanged values and keeps at most one sample per 33 ms. */
  sample(tMs: number, x: number): void {
    const v = r2(x);
    if (v === this.lastX || tMs - this.lastSampleT < AIM_SAMPLE_MS) return;
    this.lastX = v;
    this.lastSampleT = tMs;
    this.data.aim.push([Math.round(tMs), v]);
  }

  launch(tMs: number, kind: LaunchKind, count = 1): void {
    if (count > 0) this.data.launches.push([Math.round(tMs), kind, count]);
  }

  /** Call after each sim step: samples the cannon and records launches since the last call. */
  afterStep(w: TraceWorld): void {
    const t = w.time * 1000;
    this.sample(t, w.cannonX);
    this.launch(t, 'bee', w.stats.fired - this.fired);
    this.launch(t, 'queen', w.stats.queens - this.queens);
    this.fired = w.stats.fired;
    this.queens = w.stats.queens;
  }

  end(tMs: number, outcome: TraceOutcome, nestLeftPct: number, hiveLeft: number): void {
    this.data.results.push({ t: Math.round(tMs), outcome, nestLeftPct, hiveLeft });
  }

  toJSON(): AimTraceJson {
    return this.data;
  }
}

/** Battle-end panel with Download and Copy buttons. Returns a remover. */
export function mountTraceExport(trace: AimTrace, root: HTMLElement = document.body): () => void {
  const json = JSON.stringify(trace.toJSON());
  const d = trace.toJSON();
  const name = `aim-trace-${d.level}-${d.startedAt.replace(/[:.]/g, '-')}.json`;
  const el = document.createElement('div');
  el.className = 'aim-trace-export';
  el.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:9999;display:flex;gap:6px;font:12px sans-serif';
  el.innerHTML = '<button data-t="dl">⬇ Aim trace</button><button data-t="copy">Copy</button>';
  el.querySelector('[data-t="dl"]')!.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const copy = el.querySelector<HTMLButtonElement>('[data-t="copy"]')!;
  copy.addEventListener('click', () => {
    void navigator.clipboard?.writeText(json).then(
      () => (copy.textContent = 'Copied'),
      () => (copy.textContent = 'Copy failed'),
    );
  });
  root.appendChild(el);
  return () => el.remove();
}
