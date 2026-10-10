import * as THREE from 'three';
import { gateLabel } from '../sim/gates';
import { UnitKind, type GateDef, type LevelDef } from '../sim/types';
import type { UnitPool } from '../sim/units';
import type { World } from '../sim/world';
import { Particles } from './particles';
import { drawLabel, grassTexture, labelTexture, stripeTexture } from './textures';

import { COLORS, type Palette } from '../ui/theme';

/** Original palette: honey yellow + teal (player) vs plum purple + orange (rivals). */
let PALETTE: Palette & { trap: string; add: string } = {
  ...COLORS,
  trap: COLORS.danger,
  add: COLORS.success,
};
let GATE_COLOR: Record<GateDef['kind'], string> = {
  mul: COLORS.teal,
  add: COLORS.success,
  sub: COLORS.danger,
};

interface GateView {
  group: THREE.Group;
  canvas?: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  lastShown: number;
  pulse: number;
}

/** Maps sim (x, y-up-lane) to world (x, 0, -y). Camera sits behind the hive. */
export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  readonly particles = new Particles();
  private readonly level: LevelDef;
  private readonly bees: Record<'worker' | 'queen', THREE.InstancedMesh>;
  private readonly wasps: Record<'wasp' | 'hornet', THREE.InstancedMesh>;
  private readonly wings: THREE.InstancedMesh;
  private readonly cannon = new THREE.Group();
  private readonly nest = new THREE.Group();
  private readonly hive = new THREE.Group();
  private readonly gates: GateView[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private shake = 0;
  private nestPulse = 0;
  private cannonKick = 0;
  private t = 0;

  constructor(canvas: HTMLCanvasElement, level: LevelDef, pal: Palette = COLORS) {
    PALETTE = { ...pal, trap: pal.danger, add: pal.success };
    GATE_COLOR = { mul: pal.teal, add: pal.success, sub: pal.danger };
    this.level = level;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#ffd9a8');
    this.scene.fog = new THREE.Fog('#ffd9a8', 45, 75);

    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#7a5aa0', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 1.6);
    sun.position.set(-6, 14, 6);
    this.scene.add(sun);

    this.buildLane();
    this.bees = {
      worker: this.unitMesh(stripeTexture(PALETTE.honey, '#2b1d0e'), 600, 0.22),
      queen: this.unitMesh(stripeTexture('#ffb000', '#7a2e8e', 2), 200, 0.6),
    };
    this.wasps = {
      wasp: this.unitMesh(stripeTexture(PALETTE.plum, PALETTE.orange), 400, 0.24),
      hornet: this.unitMesh(stripeTexture('#4a1d63', '#ffb34d', 2), 100, 0.45),
    };
    const wingGeo = new THREE.SphereGeometry(1, 8, 6);
    wingGeo.scale(1, 0.15, 0.55);
    this.wings = new THREE.InstancedMesh(
      wingGeo,
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }),
      2000,
    );
    this.wings.frustumCulled = false;
    this.scene.add(this.wings);
    this.scene.add(this.particles.mesh);
    this.buildCannon();
    this.buildNest();
    this.buildHive();
    level.gates.forEach((g) => this.buildGate(g));
  }

  private buildLane(): void {
    const L = this.level;
    const tex = grassTexture();
    tex.repeat.set(2, L.laneLength / 4);
    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(L.laneWidth, L.laneLength + 6),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0, -L.laneLength / 2 + 1);
    this.scene.add(lane);

    const soil = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 140),
      new THREE.MeshLambertMaterial({ color: '#e9a86b' }),
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(0, -0.02, -L.laneLength / 2);
    this.scene.add(soil);

    // Picket-style borders + flowers along the lane edges.
    const rail = new THREE.BoxGeometry(0.3, 0.5, L.laneLength + 6);
    const railMat = new THREE.MeshLambertMaterial({ color: '#fff3d6' });
    for (const side of [-1, 1]) {
      const r = new THREE.Mesh(rail, railMat);
      r.position.set(side * (L.laneWidth / 2 + 0.15), 0.25, -L.laneLength / 2 + 1);
      this.scene.add(r);
    }
    const petal = new THREE.SphereGeometry(0.35, 8, 6);
    const colors = ['#ff6fa8', '#ffffff', '#b78cff', '#ffd23f'];
    for (let i = 0; i < 26; i++) {
      for (const side of [-1, 1]) {
        const f = new THREE.Mesh(
          petal,
          new THREE.MeshLambertMaterial({ color: colors[(i + side + 4) % 4] }),
        );
        f.position.set(side * (L.laneWidth / 2 + 1.1 + ((i * 7) % 3) * 0.6), 0.3, -i * 1.8 + 3);
        this.scene.add(f);
      }
    }
  }

  private unitMesh(tex: THREE.Texture, count: number, radius: number): THREE.InstancedMesh {
    const geo = new THREE.SphereGeometry(radius, 10, 8);
    geo.rotateX(Math.PI / 2); // stripes run across the body
    geo.scale(1, 1, 1.35);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: tex }), count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  private buildCannon(): void {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.9, 0.5, 6),
      new THREE.MeshLambertMaterial({ color: '#1f8f86' }),
    );
    base.position.y = 0.25;
    const pot = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 14, 10),
      new THREE.MeshLambertMaterial({ color: PALETTE.teal }),
    );
    pot.position.y = 0.8;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 1.1, 10),
      new THREE.MeshLambertMaterial({ color: PALETTE.honey }),
    );
    barrel.rotation.x = -Math.PI / 2.6;
    barrel.position.set(0, 1.05, -0.45);
    barrel.name = 'barrel';
    this.cannon.add(base, pot, barrel);
    this.cannon.position.z = -0.2;
    this.scene.add(this.cannon);
  }

  private buildNest(): void {
    const L = this.level;
    const mat = new THREE.MeshLambertMaterial({ color: PALETTE.plum });
    const band = new THREE.MeshLambertMaterial({ color: PALETTE.orange });
    for (let i = 0; i < 5; i++) {
      const r = 2.6 - Math.abs(i - 1.6) * 0.55;
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.9, r, 0.9, 12),
        i % 2 ? band : mat,
      );
      ring.position.y = 0.45 + i * 0.85;
      this.nest.add(ring);
    }
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 16),
      new THREE.MeshBasicMaterial({ color: '#1b0b24' }),
    );
    hole.position.set(0, 1.5, 2.25);
    this.nest.add(hole);
    // Side walls make the full top edge read as "nest territory".
    const wall = new THREE.Mesh(new THREE.BoxGeometry(L.laneWidth, 0.8, 0.6), mat);
    wall.position.set(0, 0.4, 0.6);
    this.nest.add(wall);
    this.nest.position.set(0, 0, -L.laneLength - 1.4);
    this.scene.add(this.nest);
  }

  private buildHive(): void {
    const hexMat = new THREE.MeshLambertMaterial({ color: '#f2a516' });
    const hexGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.8, 6);
    for (let i = -4; i <= 4; i++) {
      const h = new THREE.Mesh(hexGeo, hexMat);
      h.position.set(i * 1.12, 0.4 + (i % 2 ? 0.25 : 0), 1.4);
      this.hive.add(h);
    }
    this.scene.add(this.hive);
  }

  private buildGate(g: GateDef): void {
    const group = new THREE.Group();
    const color = GATE_COLOR[g.kind];
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(g.width, 1.6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    panel.position.y = 0.8;
    const texture = labelTexture(gateLabel(g), color, g.kind === 'sub' ? 'trap' : '');
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(2.4, g.width * 0.9), 1.1),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    );
    label.position.y = 2.2;
    label.rotation.x = -0.35;
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6);
    const postMat = new THREE.MeshLambertMaterial({ color: '#3f8f3a' });
    const bloom = new THREE.MeshLambertMaterial({
      color: g.kind === 'sub' ? '#4a1d63' : '#ff6fa8',
    });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set((side * g.width) / 2, 1.1, 0);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), bloom);
      flower.position.set((side * g.width) / 2, 2.3, 0);
      group.add(post, flower);
    }
    group.add(panel, label);
    group.position.set(g.x, 0, -g.y);
    this.scene.add(group);
    this.gates.push({
      group,
      texture,
      canvas: texture.image as HTMLCanvasElement,
      lastShown: g.value,
      pulse: 0,
    });
  }

  setPixelRatio(r: number): void {
    const size = this.renderer.getSize(new THREE.Vector2());
    this.renderer.setPixelRatio(r);
    this.renderer.setSize(size.x, size.y, false);
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait framing: keep the whole lane width visible on narrow screens.
    const portrait = h > w;
    this.camera.fov = portrait ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  /** Lane-space x under a screen point, or null. */
  pickLaneX(ndcX: number, ndcY: number): number | null {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY } as THREE.Vector2, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, this.v);
    return hit ? hit.x : null;
  }

  addShake(a: number): void {
    this.shake = Math.min(0.6, this.shake + a);
  }

  onGate(i: number, x: number, y: number, spawned: number): void {
    this.gates[i].pulse = 1;
    this.particles.burst(x, 1, -y, PALETTE.honey, Math.min(6, 1 + spawned), 3, 0.8);
  }
  onTrap(i: number, x: number, y: number): void {
    this.gates[i].pulse = 1;
    this.particles.burst(x, 0.8, -y, PALETTE.trap, 3, 3);
  }
  onClash(x: number, y: number): void {
    if (Math.random() < 0.5) this.particles.burst(x, 0.4, -y, '#ffffff', 2, 2.5, 0.7);
  }
  onNestHit(x: number, dmg: number): void {
    this.nestPulse = 1;
    this.particles.burst(x, 1, -this.level.laneLength, PALETTE.orange, Math.min(8, 2 + dmg), 5);
    this.addShake(0.02 + Math.min(0.15, dmg * 0.01));
  }
  onHiveHit(x: number): void {
    this.particles.burst(x, 0.6, 0.6, PALETTE.plum, 6, 4);
    this.addShake(0.25);
  }
  onFire(): void {
    this.cannonKick = 1;
  }
  onEnd(won: boolean): void {
    const z = won ? -this.level.laneLength - 1 : 1;
    for (let i = 0; i < 6; i++)
      this.particles.burst((i - 2.5) * 1.5, 2, z, won ? PALETTE.honey : PALETTE.plum, 12, 7, 1.4);
    if (won) this.nest.scale.set(1, 0.25, 1);
    this.addShake(0.5);
  }

  render(world: World, dt: number): void {
    this.t += dt;
    const L = this.level;
    this.syncUnits(world.bees, this.bees.worker, this.bees.queen, UnitKind.Worker, true);
    this.syncUnits(world.wasps, this.wasps.wasp, this.wasps.hornet, UnitKind.Wasp, false);
    this.syncWings(world);

    // Cannon
    this.cannon.position.x = world.cannonX;
    this.cannonKick = Math.max(0, this.cannonKick - dt * 10);
    const s = 1 + this.cannonKick * 0.08;
    this.cannon.scale.set(s, 1 / s, s);

    // Gates
    for (let i = 0; i < this.gates.length; i++) {
      const gv = this.gates[i];
      const g = L.gates[i];
      gv.group.visible = world.gateActive(i);
      gv.group.position.x = world.currentGateX(i);
      gv.pulse = Math.max(0, gv.pulse - dt * 6);
      const ps = 1 + gv.pulse * 0.12;
      gv.group.scale.set(ps, ps, ps);
      if (g.kind === 'sub') {
        const left = world.trapRemaining(i);
        if (left !== gv.lastShown && gv.canvas) {
          gv.lastShown = left;
          drawLabel(
            gv.canvas,
            left > 0 ? `−${left}` : '✓',
            left > 0 ? PALETTE.trap : '#999',
            left > 0 ? 'trap' : 'broken',
          );
          gv.texture.needsUpdate = true;
        }
      }
    }

    // Nest squash + shrink with HP
    this.nestPulse = Math.max(0, this.nestPulse - dt * 8);
    if (world.outcome !== 'won') {
      const hpShare = world.nestHp / L.nestHp;
      const base = 0.55 + 0.45 * hpShare;
      this.nest.scale.set(
        base * (1 + this.nestPulse * 0.08),
        base * (1 - this.nestPulse * 0.1),
        base,
      );
    }

    this.particles.update(dt);

    // Camera with decaying shake
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const portrait = this.camera.aspect < 1;
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    this.camera.position.set(sx, (portrait ? 21 : 17) + sy, portrait ? 12 : 10);
    this.camera.lookAt(0, 0, portrait ? -L.laneLength * 0.47 : -L.laneLength * 0.5);
    this.renderer.render(this.scene, this.camera);
  }

  private syncUnits(
    pool: UnitPool,
    small: THREE.InstancedMesh,
    big: THREE.InstancedMesh,
    smallKind: UnitKind,
    up: boolean,
  ): void {
    let ns = 0;
    let nb = 0;
    const yaw = up ? Math.PI : 0;
    for (let i = 0; i < pool.count; i++) {
      const isSmall = pool.kind[i] === smallKind;
      const mesh = isSmall ? small : big;
      const idx = isSmall ? ns : nb;
      if (idx >= mesh.instanceMatrix.count) continue;
      const bob = Math.sin(this.t * 18 + i * 1.7) * 0.06;
      // Big units with folded overflow HP grow slightly so the extra power reads.
      const extra = isSmall ? Math.min(0.8, (pool.hp[i] - 1) * 0.08) : 0;
      // Wasp Matriarch reuses the hornet mesh at boss scale (art pass: M3).
      const sc = pool.kind[i] === UnitKind.Matriarch ? 2.2 : 1 + extra;
      this.q.setFromAxisAngle(this.v.set(0, 1, 0), yaw + pool.vx[i] * 0.15);
      this.m.compose(
        this.v.set(pool.x[i], 0.35 * sc + 0.1 + bob, -pool.y[i]),
        this.q,
        this.s.set(sc, sc, sc),
      );
      mesh.setMatrixAt(idx, this.m);
      if (isSmall) ns++;
      else nb++;
    }
    small.count = ns;
    big.count = nb;
    small.instanceMatrix.needsUpdate = true;
    big.instanceMatrix.needsUpdate = true;
  }

  private syncWings(world: World): void {
    let n = 0;
    const flap = Math.sin(this.t * 60) * 0.5;
    for (const pool of [world.bees, world.wasps]) {
      for (let i = 0; i < pool.count && n < this.wings.instanceMatrix.count - 1; i += 1) {
        const k = pool.kind[i];
        const r = k === UnitKind.Queen ? 0.55 : k === UnitKind.Hornet ? 0.42 : 0.2;
        for (const side of [-1, 1]) {
          this.q.setFromAxisAngle(this.v.set(0, 0, 1), side * (0.4 + flap));
          this.m.compose(
            this.v.set(pool.x[i] + side * r * 0.9, 0.55 + r, -pool.y[i]),
            this.q,
            this.s.set(r * 0.9, r * 0.9, r * 0.9),
          );
          this.wings.setMatrixAt(n++, this.m);
        }
      }
    }
    this.wings.count = n;
    this.wings.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
