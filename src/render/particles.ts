import * as THREE from 'three';

/** Pooled instanced particle bursts (gate pops, clashes, nest hits). */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private readonly max: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly vz: Float32Array;
  private readonly life: Float32Array;
  private readonly size: Float32Array;
  private next = 0;
  private readonly m = new THREE.Matrix4();
  private readonly color = new THREE.Color();

  constructor(max = 800) {
    this.max = max;
    const geo = new THREE.IcosahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    [this.px, this.py, this.pz, this.vx, this.vy, this.vz, this.life, this.size] = Array.from(
      { length: 8 },
      () => new Float32Array(max),
    );
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.color.set('#fff'));
  }

  burst(x: number, y: number, z: number, color: string, n: number, speed = 4, size = 1): void {
    this.color.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.px[i] = x;
      this.py[i] = y;
      this.pz[i] = z;
      this.vx[i] = Math.cos(a) * s;
      this.vz[i] = Math.sin(a) * s;
      this.vy[i] = 2 + Math.random() * speed;
      this.life[i] = 0.5 + Math.random() * 0.3;
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.mesh.setColorAt(i, this.color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        this.m.makeScale(0, 0, 0);
      } else {
        this.life[i] -= dt;
        this.vy[i] -= 14 * dt;
        this.px[i] += this.vx[i] * dt;
        this.py[i] = Math.max(0.05, this.py[i] + this.vy[i] * dt);
        this.pz[i] += this.vz[i] * dt;
        const s = Math.max(0, this.life[i]) * 1.6 * this.size[i];
        this.m.makeScale(s, s, s).setPosition(this.px[i], this.py[i], this.pz[i]);
      }
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
