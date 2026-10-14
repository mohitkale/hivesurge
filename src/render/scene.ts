import * as THREE from 'three';
import { gateLabel } from '../sim/gates';
import { UnitKind, type GateDef, type LevelDef } from '../sim/types';
import type { UnitPool } from '../sim/units';
import type { World } from '../sim/world';
import {
  frameCamera,
  GLYPH_SHARE,
  LABEL_TILT,
  labelCentreY,
  labelHeight,
  labelScale,
} from './gateLabel';
import { Particles } from './particles';
import { drawLabel, grassTexture, labelTexture } from './textures';
import {
  beeCrowdGeometry,
  beeGeometry,
  cannonGeometry,
  crowdFarGeometry,
  hornetGeometry,
  nestGeometry,
  queenGeometry,
  waspGeometry,
} from '../art/models';
import { BIOMES, layoutBiome, type BiomeKit } from '../art/biomes';
import { scaledModel, type ModelLibrary } from '../art/glbLoader';
import {
  DEFAULT_SKIN,
  skinCrowdGeometry,
  skinFarGeometry,
  skinGeometry,
  type BeeSkin,
} from '../art/skins';
import { CrowdLodSwitch, LOD_EDGE_FRACS, LOD_MARGIN_FRAC, LodBand, nextBand } from './crowdLod';
import { TIER_SETTINGS, type TierSettings } from './quality';

import { ART } from '../art/palette';
import { COLORS, type Palette } from '../ui/theme';

/** Original palette: honey yellow + teal (player) vs plum purple + orange (rivals). */
let PALETTE: Palette & { trap: string; add: string } = {
  ...COLORS,
  trap: COLORS.gateTrap,
  add: COLORS.gateAdd,
};
let GATE_COLOR: Record<GateDef['kind'], string> = {
  mul: COLORS.gateMul,
  add: COLORS.gateAdd,
  sub: COLORS.gateTrap,
};

interface GateView {
  group: THREE.Group;
  canvas?: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  lastShown: number;
  pulse: number;
  label: THREE.Mesh;
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
  private readonly biome: BiomeKit;
  private readonly cannon = new THREE.Group();
  private readonly leadLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(6), 3),
    ),
    new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.4, gapSize: 0.3 }),
  );
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

  /** GLB geometries (M3-5); any missing model uses the procedural one. */
  private readonly models: ModelLibrary | null;
  /** Which models came from GLB this build (for tests / the debug overlay). */
  readonly glbUsed: string[] = [];
  /** Equipped non-classic bee skin, or null for the classic (GLB or procedural) bee. */
  readonly beeSkin: BeeSkin | null;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDef,
    pal: Palette = COLORS,
    models: ModelLibrary | null = null,
    biome: BiomeKit = BIOMES.clover,
    skin: BeeSkin | null = null,
    quality: { antialias: boolean; settings: TierSettings } = {
      antialias: true,
      settings: TIER_SETTINGS.high,
    },
  ) {
    this.models = models;
    // QA M2-19a: a non-classic skin uses the procedural skinned bee (no GLB variants yet).
    this.beeSkin = skin && skin.id !== DEFAULT_SKIN ? skin : null;
    this.biome = biome;
    PALETTE = { ...pal, trap: pal.gateTrap, add: pal.gateAdd };
    GATE_COLOR = { mul: pal.gateMul, add: pal.gateAdd, sub: pal.gateTrap };
    this.level = level;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // MSAA is fixed for the life of the GL context; it is off on software renderers.
      antialias: quality.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(this.biome.sky);
    this.fog = new THREE.Fog(this.biome.fog, 45, 75);
    this.scene.fog = this.fog;

    this.lights.push(
      new THREE.HemisphereLight(this.biome.light[0], this.biome.light[1], 1.6),
      new THREE.DirectionalLight('#ffffff', 1.6),
    );
    this.lights[1].position.set(-6, 14, 6);
    this.scene.add(...this.lights);

    this.buildLane();
    this.bees = {
      worker: this.unitMesh(
        this.beeSkin ? skinGeometry(this.beeSkin, 0.42) : this.model('unit-bee', 0.42, beeGeometry),
        600,
        0.42,
        22,
      ),
      queen: this.unitMesh(this.model('unit-queen', 0.95, queenGeometry), 200, 0.95, 16),
    };
    this.wasps = {
      wasp: this.unitMesh(this.model('unit-wasp', 0.5, waspGeometry), 400, 0.5, 30),
      hornet: this.unitMesh(this.model('unit-hornet', 0.85, hornetGeometry), 100, 0.85, 24),
    };
    // Crowd LOD meshes (fix/crowd-lod-hysteresis): mid = 148-tri crowd bee, far = 20-tri stand-in.
    this.lod = {
      workerMid: this.unitMesh(
        this.beeSkin ? skinCrowdGeometry(this.beeSkin, 0.42) : beeCrowdGeometry(0.42),
        600,
        0.42,
        22,
      ),
      workerFar: this.unitMesh(
        this.beeSkin ? skinFarGeometry(this.beeSkin, 0.42) : crowdFarGeometry(0.42),
        600,
        0.42,
        22,
      ),
      waspFar: this.unitMesh(crowdFarGeometry(0.5, ART.waspBody, ART.waspBand), 400, 0.5, 30),
    };
    this.scene.add(this.particles.mesh);
    this.buildCannon();
    this.buildNest();
    this.buildHive();
    level.gates.forEach((g) => this.buildGate(g));
    this.applyQuality(quality.settings);
  }

  private readonly fog: THREE.Fog;
  private readonly lod: Record<'workerMid' | 'workerFar' | 'waspFar', THREE.InstancedMesh>;
  /** Per-side crowd switch (enter/exit thresholds + hold), exposed for the debug overlay. */
  readonly crowdLod = {
    bees: new CrowdLodSwitch(TIER_SETTINGS.high.crowdLod),
    wasps: new CrowdLodSwitch(TIER_SETTINGS.high.crowdLod),
  };
  private readonly lights: THREE.Light[] = [];
  private readonly scatterProps: THREE.InstancedMesh[] = [];
  private readonly backdropProps: THREE.InstancedMesh[] = [];
  private readonly unlitTwins = new Map<THREE.Material, THREE.MeshBasicMaterial>();
  private readonly litOf = new Map<THREE.Material, THREE.Material>();
  /** Tier settings currently applied (debug overlay, tests). */
  quality: TierSettings = TIER_SETTINGS.high;

  /**
   * Apply a quality tier (fix/perf-lowend): fog, biome props, lit/unlit materials and the
   * particle budget. Pixel ratio is applied separately (setPixelRatio).
   */
  applyQuality(q: TierSettings): void {
    this.quality = q;
    this.crowdLod.bees.thresholds = q.crowdLod;
    this.crowdLod.wasps.thresholds = q.crowdLod;
    this.scene.fog = q.fog ? this.fog : null;
    for (const m of this.scatterProps) m.visible = q.props > 0;
    for (const m of this.backdropProps) m.visible = q.props >= 1;
    const unlit = q.lighting === 'unlit';
    for (const l of this.lights) l.visible = !unlit;
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      mesh.material = unlit
        ? this.unlitOf(mesh.material)
        : (this.litOf.get(mesh.material) ?? mesh.material);
    });
    this.particles.setBudget(q.particles);
  }

  /** MeshBasic twin of a lit material: same colour/map/vertex colours/shader patch, no lighting. */
  private unlitOf(m: THREE.Material): THREE.Material {
    if (!(m instanceof THREE.MeshLambertMaterial)) return m;
    let b = this.unlitTwins.get(m);
    if (!b) {
      b = new THREE.MeshBasicMaterial({
        color: m.color,
        map: m.map,
        vertexColors: m.vertexColors,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
      });
      b.onBeforeCompile = m.onBeforeCompile;
      b.customProgramCacheKey = m.customProgramCacheKey;
      this.unlitTwins.set(m, b);
      this.litOf.set(b, m);
    }
    return b;
  }

  private buildLane(): void {
    const L = this.level;
    const kit = this.biome;
    const tex = grassTexture(kit.lane, kit.laneAlt);
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
      new THREE.MeshLambertMaterial({ color: kit.soil }),
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(0, -0.02, -L.laneLength / 2);
    this.scene.add(soil);

    // Picket-style borders + flowers along the lane edges.
    const rail = new THREE.BoxGeometry(0.3, 0.5, L.laneLength + 6);
    const railMat = new THREE.MeshLambertMaterial({ color: kit.rail });
    for (const side of [-1, 1]) {
      const r = new THREE.Mesh(rail, railMat);
      r.position.set(side * (L.laneWidth / 2 + 0.15), 0.25, -L.laneLength / 2 + 1);
      this.scene.add(r);
    }
    // Biome kit: edge scatter, rail posts and backdrop (one InstancedMesh per prop id).
    const propMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const slots: Record<string, THREE.Matrix4[]> = {};
    const up = new THREE.Vector3(0, 1, 0);
    // Backdrop pieces (well outside the lane) get their own meshes so 'med' can drop them.
    const backdropX = L.laneWidth / 2 + 3;
    for (const p of layoutBiome(kit, L.laneWidth, L.laneLength))
      (slots[`${Math.abs(p.x) > backdropX ? 'b' : 's'}:${p.id}`] ??= []).push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(p.x, 0, p.z),
          new THREE.Quaternion().setFromAxisAngle(up, p.rotY),
          new THREE.Vector3(p.scale, p.scale, p.scale),
        ),
      );
    for (const [key, mats] of Object.entries(slots)) {
      const inst = new THREE.InstancedMesh(kit.props[key.slice(2)](), propMat, mats.length);
      mats.forEach((m, k) => inst.setMatrixAt(k, m));
      this.scene.add(inst);
      (key[0] === 'b' ? this.backdropProps : this.scatterProps).push(inst);
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

  /**
   * M3-7: swap GLB geometries into the running scene once they arrive (loaded after the
   * first gameplayStart). Models that failed keep their procedural geometry.
   */
  applyModels(lib: ModelLibrary): void {
    const swap = (mesh: THREE.Mesh, name: Parameters<typeof scaledModel>[1], scale: number) => {
      const g = scaledModel(lib, name, scale);
      if (!g) return;
      mesh.geometry.dispose();
      mesh.geometry = g;
      if (!this.glbUsed.includes(name)) this.glbUsed.push(name);
    };
    if (!this.beeSkin) swap(this.bees.worker, 'unit-bee', 0.42); // keep the skinned bee
    swap(this.bees.queen, 'unit-queen', 0.95);
    swap(this.wasps.wasp, 'unit-wasp', 0.5);
    swap(this.wasps.hornet, 'unit-hornet', 0.85);
    const barrel = this.cannon.getObjectByName('barrel') as THREE.Mesh | undefined;
    if (barrel) swap(barrel, 'prop-cannon', 1);
  }

  /** GLB model if loaded, else the procedural fallback (M3-5). */
  private model(
    name: Parameters<typeof scaledModel>[1],
    scale: number,
    procedural: (scale: number) => THREE.BufferGeometry,
  ): THREE.BufferGeometry {
    const g = scaledModel(this.models, name, scale);
    if (g) this.glbUsed.push(name);
    return g ?? procedural(scale);
  }

  private buildCannon(): void {
    const body = new THREE.Mesh(
      this.model('prop-cannon', 1, () => cannonGeometry()),
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    body.name = 'barrel';
    this.cannon.add(body);
    this.cannon.position.z = -0.2;
    this.scene.add(this.cannon);
    this.leadLine.visible = false;
    this.leadLine.frustumCulled = false;
    this.scene.add(this.leadLine);
  }

  /** FTUE aim-ahead hint: dotted line from the cannon to (x, y); null hides it. */
  setLeadLine(target: { x: number; y: number } | null): void {
    if (!target) {
      this.leadLine.visible = false;
      return;
    }
    const pos = this.leadLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(0, this.cannon.position.x, 0.3, -1.2);
    pos.setXYZ(1, target.x, 0.3, -target.y);
    pos.needsUpdate = true;
    this.leadLine.computeLineDistances();
    this.leadLine.visible = true;
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
    // One instanced draw for the 9 hexes (was 9 meshes / 9 draw calls).
    const hexes = new THREE.InstancedMesh(hexGeo, hexMat, 9);
    const m = new THREE.Matrix4();
    for (let i = -4; i <= 4; i++)
      hexes.setMatrixAt(i + 4, m.makeTranslation(i * 1.12, 0.4 + (i % 2 ? 0.25 : 0), 1.4));
    hexes.computeBoundingSphere();
    this.hive.add(hexes);
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
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    panel.position.y = 0.8;
    const texture = labelTexture(gateLabel(g), color, g.kind === 'sub' ? 'trap' : '');
    // Labels grow with distance so the farthest row stays >= 18 CSS px on a
    // 360 px wide phone (art/ART_DIRECTION.md §Gates); tilted toward the camera.
    const lh = labelHeight(g.y, this.level.laneLength);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(lh * 2, lh),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false }),
    );
    label.renderOrder = 10; // plate stays readable over swarms
    label.position.y = labelCentreY(lh);
    label.rotation.x = LABEL_TILT;
    label.userData.h = lh;
    // Solid beam in the gate colour: the translucent panel alone washes out on grass.
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(g.width, 0.22, 0.22),
      new THREE.MeshLambertMaterial({ color }),
    );
    beam.position.y = 1.65;
    group.add(beam);
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
      label,
    });
  }

  /** Unmasked WebGL renderer string ('' if unavailable), probed once on a throwaway canvas. */
  static probeRendererName(): string {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return name;
    } catch {
      return '';
    }
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
    const ls = labelScale(this.camera.aspect);
    for (const gv of this.gates) {
      const lh = (gv.label.userData.h as number) * ls;
      gv.label.scale.setScalar(ls);
      gv.label.position.y = labelCentreY(lh);
    }
  }

  /** Vertices submitted per frame: visible meshes x instances (debug overlay; art ask). */
  countVertices(): number {
    let n = 0;
    this.scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry;
      const v = g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0);
      n += v * ((m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1);
    });
    return n;
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
    const nowMs = this.t * 1000;
    this.syncUnits(
      world.bees,
      [this.bees.worker, this.lod.workerMid, this.lod.workerFar],
      this.bees.queen,
      UnitKind.Worker,
      true,
      this.crowdLod.bees.update(world.bees.count, nowMs),
    );
    this.syncUnits(
      world.wasps,
      // No mid wasp model: the mid band keeps the full 154-tri wasp.
      [this.wasps.wasp, this.wasps.wasp, this.lod.waspFar],
      this.wasps.hornet,
      UnitKind.Wasp,
      false,
      this.crowdLod.wasps.update(world.wasps.count, nowMs),
    );
    this.particles.mesh.visible = this.particles.mesh.count > 0;
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
    frameCamera(this.camera, L.laneLength);
    this.camera.position.x += (Math.random() - 0.5) * this.shake;
    this.camera.position.y += (Math.random() - 0.5) * this.shake;
    this.renderer.render(this.scene, this.camera);
  }

  private readonly lodCounts = [0, 0, 0];

  /**
   * Write instance matrices for one side. Small units (workers / wasps) go to `bands[lod]`
   * when crowd LOD is on; the per-unit band has its own edge hysteresis (crowdLod.ts).
   * Meshes with no instances are hidden so they cost no draw call.
   */
  private syncUnits(
    pool: UnitPool,
    bands: [THREE.InstancedMesh, THREE.InstancedMesh, THREE.InstancedMesh],
    big: THREE.InstancedMesh,
    smallKind: UnitKind,
    up: boolean,
    crowd: boolean,
  ): void {
    const n = this.lodCounts;
    n[0] = n[1] = n[2] = 0;
    let nb = 0;
    const yaw = up ? Math.PI : 0;
    const L = this.level.laneLength;
    const edges = this.lodEdges;
    edges[0] = LOD_EDGE_FRACS[0] * L;
    edges[1] = LOD_EDGE_FRACS[1] * L;
    const margin = LOD_MARGIN_FRAC * L;
    for (let i = 0; i < pool.count; i++) {
      const isSmall = pool.kind[i] === smallKind;
      // Band state is always tracked, so units are already in the right band when LOD turns on.
      const band = (pool.lod[i] = nextBand(pool.lod[i], pool.y[i], edges, margin));
      let b: number = LodBand.Full;
      if (isSmall && crowd) b = bands[band] === bands[0] ? LodBand.Full : band;
      const mesh = isSmall ? bands[b] : big;
      const idx = isSmall ? n[b] : nb;
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
      if (isSmall) n[b]++;
      else nb++;
    }
    for (let k = 0; k < 3; k++) {
      const m = bands[k];
      if (k > 0 && m === bands[k - 1]) continue; // shared mesh (wasp mid = full)
      m.count = n[k];
      m.visible = n[k] > 0;
      if (n[k] > 0) m.instanceMatrix.needsUpdate = true;
    }
    big.count = nb;
    big.visible = nb > 0;
    if (nb > 0) big.instanceMatrix.needsUpdate = true;
  }

  private readonly lodEdges = [0, 0];

  /**
   * On-screen height (CSS px) of each gate label plate and of its main glyphs
   * (72/128 of the plate). Used by the legibility check in art/tools.
   */
  gateLabelPx(): { gateY: number; platePx: number; glyphPx: number }[] {
    const h = this.renderer.domElement.clientHeight;
    return this.gates.map((gv, i) => {
      gv.label.updateWorldMatrix(true, false);
      const lh = (gv.label.userData.h as number) * gv.label.scale.y;
      const a = this.v
        .set(0, lh / 2, 0)
        .applyMatrix4(gv.label.matrixWorld)
        .project(this.camera).y;
      const b = this.v
        .set(0, -lh / 2, 0)
        .applyMatrix4(gv.label.matrixWorld)
        .project(this.camera).y;
      const platePx = (Math.abs(a - b) * h) / 2;
      return { gateY: this.level.gates[i].y, platePx, glyphPx: platePx * GLYPH_SHARE };
    });
  }

  dispose(): void {
    // The next GameScene reuses this canvas and therefore the same GL context. CanvasTexture
    // uploads leave UNPACK_FLIP_Y / PREMULTIPLY_ALPHA set, and three's WebGLState constructor
    // then creates its empty 3D textures with them on, so WebGL warns "texImage3D: FLIP_Y or
    // PREMULTIPLY_ALPHA isn't allowed" twice per new renderer (PR 002 bug 3). Reset them.
    const gl = this.renderer.getContext();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.renderer.dispose();
  }
}
