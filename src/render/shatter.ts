import * as THREE from 'three';
import { SHATTER_S } from '../ui/trapTelegraph';

/** Shards per broken blocker and how many breaks can overlap (pool = SHARDS x SLOTS). */
export const SHARDS = 24;
export const SLOTS = 4;

/**
 * Feedback round 4: pooled glass-break shards for a blocker that reaches 0. One InstancedMesh
 * of flat triangles (one draw call, no textures, no allocation per break); each shard flies
 * out of the panel plane, spins, falls and shrinks away within SHATTER_S (0.5 s).
 */
export class Shatter {
  readonly mesh: THREE.InstancedMesh;
  private readonly n = SHARDS * SLOTS;
  private readonly p = new Float32Array(this.n * 3);
  private readonly v = new Float32Array(this.n * 3);
  private readonly rot = new Float32Array(this.n * 3);
  private readonly spin = new Float32Array(this.n * 3);
  private readonly size = new Float32Array(this.n);
  private readonly life = new Float32Array(this.n);
  private slot = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly pos = new THREE.Vector3();
  private readonly scl = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private live = 0;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-0.5, -0.4, 0, 0.55, -0.3, 0, -0.1, 0.6, 0]), 3),
    );
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false, // a short burst drawn over the swarm, like the count plates
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 13;
    this.mesh.count = 0;
    this.mesh.visible = false;
    for (let i = 0; i < this.n; i++) this.mesh.setColorAt(i, this.color.set('#fff'));
  }

  /** Break a panel of `width` x `height` centred at (x, y, z) into shards of `color`. */
  burst(x: number, y: number, z: number, width: number, height: number, color: string): void {
    const base = this.slot * SHARDS;
    this.slot = (this.slot + 1) % SLOTS;
    const c = new THREE.Color(color);
    for (let k = 0; k < SHARDS; k++) {
      const i = base + k;
      // Spread over the panel on a jittered grid so the break reads as the whole pane.
      const u = ((k % 6) + 0.5) / 6 - 0.5 + (Math.random() - 0.5) * 0.12;
      const w = (Math.floor(k / 6) + 0.5) / Math.ceil(SHARDS / 6) - 0.5;
      this.p[i * 3] = x + u * width;
      this.p[i * 3 + 1] = y + w * height;
      this.p[i * 3 + 2] = z;
      this.v[i * 3] = u * 7 + (Math.random() - 0.5) * 2;
      this.v[i * 3 + 1] = 1.5 + Math.random() * 2.5 + w * 3;
      this.v[i * 3 + 2] = 1.5 + Math.random() * 3; // toward the camera
      for (let a = 0; a < 3; a++) {
        this.rot[i * 3 + a] = Math.random() * Math.PI;
        this.spin[i * 3 + a] = (Math.random() - 0.5) * 22;
      }
      this.size[i] = 0.6 + Math.random() * 0.5;
      this.life[i] = SHATTER_S * (0.8 + Math.random() * 0.2);
      // Glass glint: every third shard is near white.
      this.mesh.setColorAt(i, k % 3 === 0 ? this.color.set('#ffffff') : this.color.copy(c));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.live = SHATTER_S;
  }

  /** Shards currently flying (tests, debug). */
  get active(): number {
    let k = 0;
    for (let i = 0; i < this.n; i++) if (this.life[i] > 0) k++;
    return k;
  }

  update(dt: number): void {
    if (this.live <= 0) return;
    this.live -= dt;
    let hi = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) {
        this.m.makeScale(0, 0, 0);
      } else {
        hi = i + 1;
        this.life[i] -= dt;
        const o = i * 3;
        this.v[o + 1] -= 18 * dt;
        this.p[o] += this.v[o] * dt;
        this.p[o + 1] = Math.max(0.03, this.p[o + 1] + this.v[o + 1] * dt);
        this.p[o + 2] += this.v[o + 2] * dt;
        for (let a = 0; a < 3; a++) this.rot[o + a] += this.spin[o + a] * dt;
        const t = Math.max(0, this.life[i]) / SHATTER_S;
        const s = this.size[i] * Math.min(1, t * 2.2);
        this.e.set(this.rot[o], this.rot[o + 1], this.rot[o + 2]);
        this.m.compose(
          this.pos.set(this.p[o], this.p[o + 1], this.p[o + 2]),
          this.q.setFromEuler(this.e),
          this.scl.set(s, s, s),
        );
      }
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.count = hi;
    this.mesh.visible = hi > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
