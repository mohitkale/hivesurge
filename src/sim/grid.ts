/**
 * Uniform spatial hash for one team. Rebuilt every step with counting sort,
 * so lookups only touch neighbouring cells (roughly linear collision cost).
 */
export class SpatialGrid {
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  private readonly minX: number;
  private readonly cellStart: Int32Array;
  private readonly cellCount: Int32Array;
  readonly items: Int32Array;
  private readonly cellOf: Int32Array;

  constructor(width: number, length: number, cellSize: number, capacity: number) {
    this.cellSize = cellSize;
    this.minX = -width / 2 - cellSize;
    this.cols = Math.ceil(width / cellSize) + 2;
    this.rows = Math.ceil(length / cellSize) + 3;
    const n = this.cols * this.rows;
    this.cellStart = new Int32Array(n + 1);
    this.cellCount = new Int32Array(n);
    this.items = new Int32Array(capacity);
    this.cellOf = new Int32Array(capacity);
  }

  private cellIndex(x: number, y: number): number {
    let cx = Math.floor((x - this.minX) / this.cellSize);
    let cy = Math.floor((y + this.cellSize) / this.cellSize);
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  build(xs: Float32Array, ys: Float32Array, count: number): void {
    this.cellCount.fill(0);
    for (let i = 0; i < count; i++) {
      const c = this.cellIndex(xs[i], ys[i]);
      this.cellOf[i] = c;
      this.cellCount[c]++;
    }
    let acc = 0;
    for (let c = 0; c < this.cellCount.length; c++) {
      this.cellStart[c] = acc;
      acc += this.cellCount[c];
    }
    this.cellStart[this.cellCount.length] = acc;
    this.cellCount.fill(0);
    for (let i = 0; i < count; i++) {
      const c = this.cellOf[i];
      this.items[this.cellStart[c] + this.cellCount[c]++] = i;
    }
  }

  /** Calls fn(index) for every item in the 3x3 cells around (x, y). Stop early by returning true. */
  query(x: number, y: number, fn: (i: number) => boolean | void): void {
    const cx = Math.floor((x - this.minX) / this.cellSize);
    const cy = Math.floor((y + this.cellSize) / this.cellSize);
    for (let dy = -1; dy <= 1; dy++) {
      const ry = cy + dy;
      if (ry < 0 || ry >= this.rows) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const rx = cx + dx;
        if (rx < 0 || rx >= this.cols) continue;
        const c = ry * this.cols + rx;
        for (let k = this.cellStart[c], e = this.cellStart[c + 1]; k < e; k++) {
          if (fn(this.items[k])) return;
        }
      }
    }
  }
}
