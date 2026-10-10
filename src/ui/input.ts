/**
 * Unified one-thumb input. Touch / mouse: press anywhere on the lane to fire,
 * drag to aim. Keyboard: A/D or arrows aim, Space fires, Q/E launches the Queen.
 */
export class Input {
  aimX = 0;
  firing = false;
  private queenQueued = false;
  private pointerNdc: { x: number; y: number } | null = null;
  private readonly keys = new Set<string>();
  enabled = true;

  constructor(private readonly el: HTMLElement) {
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      this.firing = false;
      this.keys.clear();
    });
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

  /** Per-frame update; pick converts the pointer to lane x. */
  update(dt: number, maxX: number, pick: (x: number, y: number) => number | null): void {
    if (this.pointerNdc && this.firing) {
      const x = pick(this.pointerNdc.x, this.pointerNdc.y);
      if (x !== null) this.aimX = x;
    }
    const dir = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0);
    if (dir) this.aimX += dir * 11 * dt;
    if (this.keys.has('fire')) this.firing = true;
    this.aimX = Math.max(-maxX, Math.min(maxX, this.aimX));
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
  };
  private onMove = (e: PointerEvent) => {
    if (this.pointerNdc) this.pointerNdc = this.ndc(e);
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
