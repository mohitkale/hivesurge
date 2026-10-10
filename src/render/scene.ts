import * as THREE from 'three';
import { gateLabel } from '../sim/gates';
import { UnitKind, type GateDef, type LevelDef } from '../sim/types';
import type { UnitPool } from '../sim/units';
import type { World } from '../sim/world';
import { Particles } from './particles';
import { drawLabel, grassTexture, labelTexture } from './textures';
import {
  beeGeometry,
  cannonGeometry,
  hornetGeometry,
  nestGeometry,
  queenGeometry,
  waspGeometry,
} from '../art/models';
import { BIOMES, type BiomeKit } from '../art/biomes';

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
  private readonly unitTime = { value: 0 };
  private readonly biome: BiomeKit = BIOMES.clover;
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
    this.scene.background = new THREE.Color(this.biome.sky);
    this.scene.fog = new THREE.Fog(this.biome.fog, 45, 75);

    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#7a5aa0', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 1.6);
    sun.position.set(-6, 14, 6);
    this.scene.add(sun);

    this.buildLane();
    this.bees = {
      worker: this.unitMesh(beeGeometry(0.42), 600, 0.42, 22),
      queen: this.unitMesh(queenGeometry(0.95), 200, 0.95, 16),
    };
    this.wasps = {
      wasp: this.unitMesh(waspGeometry(0.5), 400, 0.5, 30),
      hornet: this.unitMesh(hornetGeometry(0.85), 100, 0.85, 24),
    };
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
    // Biome props scattered along the lane edges (one InstancedMesh per prop type).
    const kit = this.biome;
    const propMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const slots: Record<string, THREE.Matrix4[]> = {};
    for (let i = 0; i < 26; i++) {
      for (const side of [-1, 1]) {
        const id = kit.scatter[(i * 3 + (side + 1)) % kit.scatter.length];
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(side * (L.laneWidth / 2 + 1.1 + ((i * 7) % 3) * 0.6), 0, -i * 1.8 + 3),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.3),
          new THREE.Vector3(1.4, 1.4, 1.4),
        );
        (slots[id] ??= []).push(m);
      }
    }
    for (const [id, mats] of Object.entries(slots)) {
      const inst = new THREE.InstancedMesh(kit.props[id](), propMat, mats.length);
      mats.forEach((m, k) => inst.setMatrixAt(k, m));
      this.scene.add(inst);
    }
  }

  /**
   * Vertex-coloured, flat-shaded unit with GPU wing flap: vertices tagged
   * aWing = ±1 rotate around the body axis; phase varies per instance.
   */
  private unitMesh(
    geo: THREE.BufferGeometry,
    count: number,
    scale: number,
    flapHz: number,
  ): THREE.InstancedMesh {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const uTime = this.unitTime;
    const wingY = 0.36 * scale;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = sh.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nattribute float aWing;\nuniform float uTime;',
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          if (aWing != 0.0) {
            float a = aWing * (0.25 + 0.55 * sin(uTime * ${flapHz.toFixed(1)} + float(gl_InstanceID) * 1.7));
            vec2 p = vec2(transformed.x, transformed.y - ${wingY.toFixed(3)});
            transformed.xy = vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a) + ${wingY.toFixed(3)});
          }`,
        );
    };
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  private buildCannon(): void {
    const body = new THREE.Mesh(
      cannonGeometry(),
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    body.name = 'barrel';
    this.cannon.add(body);
    this.cannon.position.z = -0.2;
    this.scene.add(this.cannon);
  }

  private buildNest(): void {
    const L = this.level;
    this.nest.add(
      new THREE.Mesh(
        nestGeometry(L.laneWidth),
        new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      ),
    );
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
    this.unitTime.value = this.t;

    // Cannon
    this.cannon.position.x = world.cannonX;
    this.cannonKick = Math.max(0, this.cannonKick - dt * 10);
    const s = 1 + this.cannonKick * 0.08;
    this.cannon.scale.set(s, 1 / s, s);

    // Gates
    for (let i = 0; i < this.gates.length; i++) {
      const gv = this.gates[i];
      const g = L.gates[i];
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
      const sc = 1 + extra;
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

  dispose(): void {
    this.renderer.dispose();
  }
}
