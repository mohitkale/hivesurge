/* global process */
// In-page render-cost attribution (art/PERF-AUDIT.md). Same page, same frozen scene state; each
// config is rendered interleaved in rounds and the median is kept, so box load affects all equally.
// Usage: node art/tools/perf-ablate.mjs <base-url> <biome> [assets=off]
const puppeteer = (await import(process.env.PUPPETEER_MODULE)).default;
const [base = 'http://localhost:5181/', biome = 'clover', assets = 'on'] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
await p.setViewport({ width: 540, height: 960 });
const q = `?stress=500&biome=${biome}${assets === 'off' ? '&assets=off' : ''}`;
await p.goto(base + q, { waitUntil: 'load' });
await wait(800);
await p.evaluate(() =>
  localStorage.setItem(
    'hivesurge.save.v1',
    JSON.stringify({ version: 1, ftueDone: true, battlesCompleted: 1 }),
  ),
);
for (let round = 0; round < 2; round++) {
  await p.reload({ waitUntil: 'load' });
  await wait(1000);
  await p.click('[data-a="play"]');
  await wait(round ? 3500 : 4000);
}
const r = await p.evaluate(async () => {
  const sc = window.__hsScene;
  const ren = sc.renderer;
  const gl = ren.getContext();
  const px = new Uint8Array(4);
  // Freeze: stop the game loop from mutating the scene while we time (rAF no-op).
  window.requestAnimationFrame = () => 0;
  await new Promise((r) => setTimeout(r, 300));
  const groups = { units: [], particles: [], props: [], other: [] };
  sc.scene.traverse((o) => {
    if (!o.isMesh && !o.isLine) return;
    if (o.isInstancedMesh && o.instanceMatrix.count === 800) groups.particles.push(o);
    else if (
      o.isInstancedMesh &&
      [600, 200, 400, 100].includes(o.instanceMatrix.count) &&
      o.frustumCulled === false
    )
      groups.units.push(o);
    else if (o.isInstancedMesh) groups.props.push(o);
    else groups.other.push(o);
  });
  const tris = (o) =>
    ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) *
    (o.isInstancedMesh ? o.count : 1);
  const sum = (k) => groups[k].reduce((a, o) => a + tris(o), 0);
  const one = () => {
    ren.render(sc.scene, sc.camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  const set = (k, v) => groups[k].forEach((o) => (o.visible = v));
  const pr0 = ren.getPixelRatio();
  const configs = {
    all: () => {},
    'no-particles': () => set('particles', false),
    'no-props': () => set('props', false),
    'no-units': () => set('units', false),
    'particles count=live': () => {
      const m = groups.particles[0];
      m.userData.c = m.count;
      m.count = 0;
    },
    'pixelRatio 0.5x': () => ren.setPixelRatio(pr0 * 0.5),
    'antialias-free (n/a)': null,
  };
  const reset = () => {
    for (const k in groups) set(k, true);
    const m = groups.particles[0];
    if (m.userData.c != null) {
      m.count = m.userData.c;
      m.userData.c = null;
    }
    ren.setPixelRatio(pr0);
  };
  const res = {};
  for (const k in configs) if (configs[k]) res[k] = [];
  one();
  for (let round = 0; round < 5; round++)
    for (const k in res) {
      configs[k]();
      one();
      const t0 = performance.now();
      for (let i = 0; i < 5; i++) one();
      res[k].push((performance.now() - t0) / 5);
      reset();
    }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  const out = {};
  for (const k in res) out[k] = +med(res[k]).toFixed(1);
  const info = (() => {
    one();
    return { calls: ren.info.render.calls, triangles: ren.info.render.triangles };
  })();
  return {
    ms: out,
    tris: {
      units: sum('units'),
      particles: sum('particles'),
      props: sum('props'),
      other: sum('other'),
    },
    unitsLive: groups.units.map((o) => [o.count, tris(o) / Math.max(1, o.count)]),
    propMeshes: groups.props.length,
    pixelRatio: pr0,
    canvas: [ren.domElement.width, ren.domElement.height],
    glbUsed: sc.glbUsed,
    ...info,
  };
});
console.log(JSON.stringify({ biome, assets, ...r }));
await b.close();
