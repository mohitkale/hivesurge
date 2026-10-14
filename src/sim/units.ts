import { UNIT_STATS, UnitKind } from './types';

/**
 * Struct-of-arrays unit storage. No per-unit objects, no per-frame allocation.
 * Dead slots are compacted by swap-remove so live units are always [0, count).
 */
export class UnitPool {
  readonly capacity: number;
  count = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly hp: Float32Array;
  readonly kind: Uint8Array;
  /** Bitmask of gates already crossed (supports up to 32 gates per level). */
  readonly gates: Uint32Array;
  /** Small per-unit lateral wobble so crowds don't look like a single file. */
  readonly vx: Float32Array;
  /** Render-side crowd LOD band (0 full, 1 mid, 2 far); kept here so swap-remove carries it. */
  readonly lod: Uint8Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.hp = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.gates = new Uint32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.lod = new Uint8Array(capacity);
  }

  get full(): boolean {
    return this.count >= this.capacity;
  }

  /** Returns slot index, or -1 when the pool is full. */
  spawn(kind: UnitKind, x: number, y: number, gates = 0, hp = UNIT_STATS[kind].hp): number {
    if (this.count >= this.capacity) return -1;
    const i = this.count++;
    this.x[i] = x;
    this.y[i] = y;
    this.hp[i] = hp;
    this.kind[i] = kind;
    this.gates[i] = gates;
    this.vx[i] = 0;
    this.lod[i] = 0;
    return i;
  }

  remove(i: number): void {
    const last = --this.count;
    if (i !== last) {
      this.x[i] = this.x[last];
      this.y[i] = this.y[last];
      this.hp[i] = this.hp[last];
      this.kind[i] = this.kind[last];
      this.gates[i] = this.gates[last];
      this.vx[i] = this.vx[last];
      this.lod[i] = this.lod[last];
    }
  }

  /** Remove every unit whose hp dropped to zero or below. */
  sweepDead(): void {
    for (let i = this.count - 1; i >= 0; i--) if (this.hp[i] <= 0) this.remove(i);
  }

  totalHp(): number {
    let s = 0;
    for (let i = 0; i < this.count; i++) s += this.hp[i];
    return s;
  }
}
