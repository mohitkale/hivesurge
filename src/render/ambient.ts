import * as THREE from 'three';
import type { AmbientKind } from '../art/biomes';

/**
 * Feedback round 4 #5: ambient particles per environment (pollen, petals, rain, dust,
 * fireflies, embers). One draw call (Points, or LineSegments for rain), positions updated
 * on the CPU each frame; the count follows the quality tier's particle budget.
 */
interface Look {
  color: string[];
  size: number;
  /** Fall speed (negative rises), sideways drift, wobble amplitude. */
  fall: number;
  drift: number;
  wobble: number;
  additive?: boolean;
  blink?: boolean;
  opacity: number;
}

export const AMBIENT_LOOKS: Record<AmbientKind, Look> = {
  pollen: {
    color: ['#fff3a0', '#ffe066'],
    size: 0.3,
    fall: 0.15,
    drift: 0.25,
    wobble: 0.4,
    opacity: 0.85,
  },
  petals: {
    color: ['#ffb0c8', '#ffd0a0', '#ffffff'],
    size: 0.36,
    fall: 0.45,
    drift: 0.6,
    wobble: 0.6,
    opacity: 0.9,
  },
  rain: { color: ['#d6ecff'], size: 1.1, fall: 14, drift: 1.2, wobble: 0, opacity: 0.55 },
  dust: {
    color: ['#ffe0b0', '#e8b880'],
    size: 0.26,
    fall: 0.05,
    drift: 2.2,
    wobble: 0.3,
    opacity: 0.6,
  },
  fireflies: {
    color: ['#d8ff6a', '#fff27a'],
    size: 0.7,
    fall: 0,
    drift: 0.15,
    wobble: 0.5,
    additive: true,
    blink: true,
    opacity: 1,
  },
  embers: {
    color: ['#ff8a3d', '#ffc04a', '#ff5a2a'],
    size: 0.42,
    fall: -0.8,
    drift: 0.3,
    wobble: 0.4,
    additive: true,
    blink: true,
    opacity: 1,
  },
};

/** Ambient particle count for a tier's burst budget (high 800 -> 160, med 300 -> 60, low 120 -> 24). */
export const ambientCount = (particleBudget: number): number =>
  Math.max(0, Math.min(160, Math.round(particleBudget / 5)));

let dot: THREE.Texture | null = null;
/** 16x16 procedural round soft dot (no image assets). */
function dotTexture(): THREE.Texture {
  if (dot) return dot;
  const n = 16;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5) / 7.5;
      const a = Math.max(0, 1 - d * d);
      data.set([255, 255, 255, Math.round(a * 255)], (y * n + x) * 4);
    }
  dot = new THREE.DataTexture(data, n, n);
  dot.needsUpdate = true;
  return dot;
}

export class Ambient {
  readonly object: THREE.Points | THREE.LineSegments;
  readonly kind: AmbientKind;
  private readonly look: Look;
  private readonly max: number;
  private count: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly base: Float32Array;
  private readonly phase: Float32Array;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly z: Float32Array;
  private t = 0;
  private readonly rain: boolean;
  /** Highest particle origin; rain streaks reach `size` above it, so they start lower. */
  private readonly top: number;

  /** `halfWidth` / `length` / `height`: box above the lane the particles live in. */
  constructor(
    kind: AmbientKind,
    private readonly halfWidth: number,
    private readonly length: number,
    height = 6,
    max = 160,
  ) {
    this.kind = kind;
    this.look = AMBIENT_LOOKS[kind];
    this.rain = kind === 'rain';
    this.top = this.rain ? height - this.look.size : height;
    this.max = max;
    this.count = max;
    const verts = this.rain ? 2 : 1;
    this.pos = new Float32Array(max * 3 * verts);
    this.col = new Float32Array(max * 3 * verts);
    this.base = new Float32Array(max * 3);
    [this.phase, this.x, this.y, this.z] = Array.from({ length: 4 }, () => new Float32Array(max));
    const c = new THREE.Color();
    for (let i = 0; i < max; i++) {
      this.respawn(i, true);
      this.phase[i] = Math.random() * Math.PI * 2;
      c.set(this.look.color[i % this.look.color.length]);
      this.base.set([c.r, c.g, c.b], i * 3);
      for (let v = 0; v < verts; v++) this.col.set([c.r, c.g, c.b], (i * verts + v) * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const blending = this.look.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (this.rain) {
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: this.look.opacity,
        depthWrite: false,
      });
      this.object = new THREE.LineSegments(geo, mat);
    } else {
      const mat = new THREE.PointsMaterial({
        size: this.look.size,
        map: dotTexture(),
        vertexColors: true,
        transparent: true,
        opacity: this.look.opacity,
        depthWrite: false,
        blending,
        sizeAttenuation: true,
      });
      this.object = new THREE.Points(geo, mat);
    }
    this.object.frustumCulled = false;
    this.object.renderOrder = 5;
    this.update(0);
  }

  /** Live particle count (quality tier). */
  setCount(n: number): void {
    this.count = Math.max(0, Math.min(this.max, Math.floor(n)));
    this.object.geometry.setDrawRange(0, this.count * (this.rain ? 2 : 1));
    this.object.visible = this.count > 0;
  }

  get liveCount(): number {
    return this.count;
  }

  private respawn(i: number, anywhere: boolean): void {
    this.x[i] = (Math.random() * 2 - 1) * this.halfWidth;
    this.z[i] = 4 - Math.random() * (this.length + 8);
    const fall = this.look.fall;
    this.y[i] = anywhere
      ? Math.random() * this.top
      : fall > 0
        ? this.top * (0.8 + Math.random() * 0.2)
        : fall < 0
          ? 0
          : Math.random() * this.top;
  }

  update(dt: number): void {
    this.t += dt;
    const L = this.look;
    const verts = this.rain ? 2 : 1;
    for (let i = 0; i < this.count; i++) {
      const ph = this.phase[i];
      this.y[i] -= L.fall * dt * (0.7 + 0.3 * Math.sin(ph));
      this.x[i] +=
        L.drift * dt * (0.5 + 0.5 * Math.cos(ph)) + Math.sin(this.t * 1.3 + ph) * L.wobble * dt;
      if (L.fall === 0) this.y[i] = 0.6 + (ph / 6.3) * 2.5 + Math.sin(this.t * 0.9 + ph) * 0.4;
      const sideways = Math.abs(this.x[i]) > this.halfWidth + 1;
      if (sideways || this.y[i] < 0 || this.y[i] > this.top) {
        // Strong wind (dust) re-enters from the upwind edge; everything else respawns anywhere.
        this.respawn(i, sideways && L.fall === 0);
        if (sideways && L.drift > 0.5) this.x[i] = -this.halfWidth;
      }
      const o = i * 3 * verts;
      this.pos[o] = this.x[i];
      this.pos[o + 1] = this.y[i];
      this.pos[o + 2] = this.z[i];
      if (this.rain) {
        this.pos[o + 3] = this.x[i] - L.drift * 0.04;
        this.pos[o + 4] = this.y[i] + L.size;
        this.pos[o + 5] = this.z[i];
      }
      if (L.blink) {
        const k = Math.max(0, Math.sin(this.t * 2.2 + ph * 3)) ** 2;
        for (let v = 0; v < verts; v++)
          for (let c = 0; c < 3; c++)
            this.col[o + v * 3 + c] = this.base[i * 3 + c] * (0.15 + 0.85 * k);
      }
    }
    const geo = this.object.geometry;
    geo.getAttribute('position').needsUpdate = true;
    if (L.blink) geo.getAttribute('color').needsUpdate = true;
  }

  dispose(): void {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}
