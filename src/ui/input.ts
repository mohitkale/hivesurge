/**
 * Unified one-thumb input. Touch / mouse: press anywhere on the lane to fire,
 * drag to aim. Keyboard: A/D or arrows aim, Space fires, Q/E launches the Queen.
 *
 * fix/perf-lowend: pointer events are applied the moment they arrive (aim is picked in the
 * handler, not in the render loop), and a tap shorter than one frame still fires: the press
 * is latched until the sim consumes it with takeFire(). Neither depends on the render fps.
 */
export type LanePicker = (ndcX: number, ndcY: number) => number | null;

export class Input {
  aimX = 0;
  firing = false;
  private queenQueued = false;
  private pressLatched = false;
  private pointerNdc: { x: number; y: number } | null = null;
  private readonly keys = new Set<string>();
  private picker: LanePicker | null = null;
  private maxX = Infinity;
  enabled = true;
  /** performance.now() of the last pointer event applied (for latency checks). */
  lastPointerAt = 0;

  constructor(private readonly el: HTMLElement) {
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      this.firing = false;
      this.pressLatched = false;
      this.keys.clear();
    });
  }

  /** Screen-to-lane mapping used directly by pointer handlers, and the aim clamp. */
  setPicker(pick: LanePicker, maxX: number): void {
    this.picker = pick;
    this.maxX = maxX;
  }

  queueQueen(): void {
    this.queenQueued = true;
  }

  /** Read and clear the edge-triggered Queen request. */
  takeQueen(): boolean {
    const q = this.queenQueued;
    this.queenQueued = false;
    return q;
  }

  /** Firing for this sim step: held, or a press since the last call (taps never get lost). */
  takeFire(): boolean {
    const f = this.firing || this.pressLatched;
    this.pressLatched = false;
    return f;
  }

  /** Clear all transient state (battle start / end). */
  reset(): void {
    this.aimX = 0;
    this.firing = false;
    this.pressLatched = false;
    this.queenQueued = false;
  }

  /** Per-sim-step keyboard aim (rate based). Pointer aim is already applied in the handlers. */
  update(dt: number, maxX = this.maxX): void {
    this.maxX = maxX;
    const dir = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0);
    if (dir) this.aimX += dir * 11 * dt;
    if (this.keys.has('fire')) this.firing = true;
    this.aimX = this.clamp(this.aimX);
  }

  private clamp(x: number): number {
    return Math.max(-this.maxX, Math.min(this.maxX, x));
  }

  private aimAt(ndc: { x: number; y: number }): void {
    if (!this.picker) return;
    const x = this.picker(ndc.x, ndc.y);
    if (x !== null) this.aimX = this.clamp(x);
  }

  private ndc(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: -((e.clientY - r.top) / r.height) * 2 + 1,
    };
  }

  private onDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    this.pointerNdc = this.ndc(e);
    this.firing = true;
    this.pressLatched = true;
    this.aimAt(this.pointerNdc);
    this.lastPointerAt = performance.now();
  };
  private onMove = (e: PointerEvent) => {
    if (!this.pointerNdc || !this.enabled) return;
    this.pointerNdc = this.ndc(e);
    this.aimAt(this.pointerNdc);
    this.lastPointerAt = performance.now();
  };
  private onUp = () => {
    this.pointerNdc = null;
    if (!this.keys.has('fire')) this.firing = false;
  };
  private map(code: string): string | null {
    if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD') return 'right';
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') return 'fire';
    return null;
  }
  private onKey = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    if (e.code === 'KeyQ' || e.code === 'KeyE') {
      this.queueQueen();
      return;
    }
    const k = this.map(e.code);
    if (k) {
      e.preventDefault();
      if (k === 'fire') this.pressLatched = true;
      this.keys.add(k);
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const k = this.map(e.code);
    if (!k) return;
    this.keys.delete(k);
    if (k === 'fire' && !this.pointerNdc) this.firing = false;
  };
}
