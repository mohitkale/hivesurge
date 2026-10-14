/* global process */
// Headless perf audit (art/PERF-AUDIT.md): same setup per case, ?stress=500, SwiftShader.
// Usage: node art/tools/perf-audit.mjs http://localhost:5181/ > out.json
const puppeteer = (await import(process.env.PUPPETEER_MODULE)).default;
const base = process.argv[2] ?? 'http://localhost:5181/';
const extra = process.argv[3] ?? '';
const cases = [
  ['assets=off', 'clover'],
  ['assets=on', 'clover'],
  ['assets=on', 'meadow'],
  ['assets=on', 'orchard'],
  ['assets=on', 'dusk'],
];
const BIOMES = (process.env.BIOMES ?? '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const out = [];
const list = BIOMES.length
  ? [['assets=off', BIOMES[0]], ...BIOMES.map((x) => ['assets=on', x])]
  : cases;
for (const [assets, biome] of list) {
  const p = await b.newPage();
  await p.setViewport({ width: 540, height: 960 });
  const q = `?stress=500&biome=${biome}${assets === 'assets=off' ? '&assets=off' : ''}${extra}`;
  await p.goto(base + q, { waitUntil: 'load' });
  await wait(800);
  await p.evaluate(() =>
    localStorage.setItem(
      'hivesurge.save.v1',
      JSON.stringify({ version: 1, ftueDone: true, battlesCompleted: 1 }),
    ),
  );
  // Play once so GLBs load (they load after the first gameplayStart), then go home and replay.
  for (let round = 0; round < 2; round++) {
    await p.reload({ waitUntil: 'load' });
    await wait(1000);
    await p.click('[data-a="play"]');
    await wait(round === 0 ? 4000 : 3000);
  }
  const r = await p.evaluate(async () => {
    const sc = window.__hsScene;
    const ren = sc.renderer;
    ren.info.autoReset = true;
    const ft = [];
    let last = performance.now();
    await new Promise((res) => {
      const end = last + 5000;
      const f = (t) => {
        ft.push(t - last);
        last = t;
        if (t < end) requestAnimationFrame(f);
        else res();
      };
      requestAnimationFrame(f);
    });
    ft.sort((a, b) => a - b);
    // Isolated render cost for this exact scene state: 30 renders, each synced with a 1px readPixels.
    const gl = ren.getContext();
    const px = new Uint8Array(4);
    const one = () => {
      ren.render(sc.scene, sc.camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    };
    one();
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) one();
    const renderMs = (performance.now() - t0) / 30;
    const units = {};
    sc.scene.traverse((o) => {
      if (o.isInstancedMesh && o.geometry.attributes.aWing) {
        const a = o.geometry.attributes;
        units[o.geometry.uuid.slice(0, 4)] = {
          count: o.count,
          verts: a.position.count,
          indexed: !!o.geometry.index,
          pos: a.position.array.constructor.name + (a.position.normalized ? '(norm)' : ''),
          normal: !!a.normal,
          attrs: Object.keys(a),
        };
      }
    });
    const objs = [];
    const mats = new Set();
    sc.scene.traverse((o) => {
      if (!o.isMesh && !o.isLine) return;
      const g = o.geometry;
      const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => mats.add(m));
      objs.push({
        type: o.isInstancedMesh ? 'inst' : o.isLine ? 'line' : 'mesh',
        name: o.name,
        tris,
        count: o.isInstancedMesh ? o.count : 1,
        cap: o.isInstancedMesh ? o.instanceMatrix.count : 1,
        transparent: ms.some((m) => m.transparent),
        shadow: o.castShadow || o.receiveShadow,
      });
    });
    return {
      renderMs,
      units,
      medianMs: ft[ft.length >> 1],
      p99Ms: ft[Math.floor(ft.length * 0.99)],
      frames: ft.length,
      calls: ren.info.render.calls,
      triangles: ren.info.render.triangles,
      programs: ren.info.programs?.length,
      materials: mats.size,
      transparentMats: [...mats].filter((m) => m.transparent).length,
      shadowMap: ren.shadowMap.enabled,
      pixelRatio: ren.getPixelRatio(),
      glbUsed: sc.glbUsed,
      objs,
    };
  });
  out.push({ assets, biome, ...r });
  console.error(
    assets,
    biome,
    r.medianMs.toFixed(1),
    'render',
    r.renderMs.toFixed(1),
    r.calls,
    r.triangles,
    r.glbUsed.length,
  );
  await p.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
