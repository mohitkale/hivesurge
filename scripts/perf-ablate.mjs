// Render-cost ablation (fix/perf-lowend). Freezes one battle frame and times
// renderer.render + a 1-pixel readback (forces SwiftShader to finish) per configuration,
// interleaving every configuration with the reference so box load drift cancels out.
// node scripts/perf-ablate.mjs <dev-url-with-?level=...> [reps=3]
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core');
const [base, reps = '3'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: 'new',
  protocolTimeout: 0,
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
async function measure(quality) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${base}&quality=${quality}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.$eval('[data-a=play]', (b) => b.click()).catch(() => {});
  await page.mouse.move(640, 560);
  await page.mouse.down();
  await sleep(12000); // swarm builds up, GLBs swapped in
  await page.evaluate(() => (window.requestAnimationFrame = () => 0)); // freeze the game
  await sleep(1500);
  const r = await page.evaluate((reps) => {
    const sc = window.__hsScene;
    const r = sc.renderer;
    const gl = r.getContext();
    const px = new Uint8Array(4);
    const time = (n = 3) => {
      r.render(sc.scene, sc.camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const a = performance.now();
      for (let i = 0; i < n; i++) {
        r.render(sc.scene, sc.camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      }
      return (performance.now() - a) / n;
    };
    const size = r.getSize({
      x: 0,
      y: 0,
      set(a, b) {
        this.x = a;
        this.y = b;
        return this;
      },
    });
    const tier = {
      high: {
        shadows: false,
        maxPixelRatio: 2,
        lighting: 'lit',
        fog: true,
        props: 1,
        particles: 800,
        crowdLodAt: 300,
      },
      med: {
        shadows: false,
        maxPixelRatio: 1,
        lighting: 'lit',
        fog: false,
        props: 0.5,
        particles: 300,
        crowdLodAt: 120,
      },
      low: {
        shadows: false,
        maxPixelRatio: 0.6,
        lighting: 'unlit',
        fog: false,
        props: 0,
        particles: 120,
        crowdLodAt: 0,
      },
    };
    const set = (q, pr) => {
      sc.applyQuality(q);
      r.setPixelRatio(pr);
      r.setSize(size.x, size.y, false);
      r.render(sc.scene, sc.camera); // compile any new programs outside the timing
    };
    const H = tier.high;
    const configs = {
      'high@pr1 (reference)': [H, 1],
      'high@pr0.75 (old scaler floor)': [H, 0.75],
      'high@pr1 fog off': [{ ...H, fog: false }, 1],
      'high@pr1 backdrop props off': [{ ...H, props: 0.5 }, 1],
      'high@pr1 all biome props off': [{ ...H, props: 0 }, 1],
      'high@pr1 unlit materials': [{ ...H, lighting: 'unlit' }, 1],
      'med@pr1': [tier.med, 1],
      'low@pr0.6': [tier.low, 0.6],
      'low@pr0.5 (floor)': [tier.low, 0.5],
    };
    const out = {};
    const units = sc.scene.children.filter(
      (o) => o.isInstancedMesh && o.instanceMatrix.usage === 35048,
    );
    for (let k = 0; k < reps; k++)
      for (const [name, [q, pr]] of Object.entries(configs)) {
        set(H, 1);
        const ref = time();
        set(q, pr);
        const ms = time();
        const info = { calls: r.info.render.calls, tris: r.info.render.triangles };
        (out[name] ??= { ms: [], ref: [], ...info }).ms.push(ms);
        out[name].ref.push(ref);
      }
    set(H, 1);
    for (const u of units) u.visible = false;
    const noUnits = time();
    for (const u of units) u.visible = true;
    const withUnits = time();
    return {
      msaaSamples: gl.getParameter(gl.SAMPLES),
      canvas: [size.x, size.y],
      units: units.map((u) => u.count).join('+'),
      unitShareHigh: 1 - noUnits / withUnits,
      out,
    };
  }, Number(reps));
  await page.close();
  return r;
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const q of ['high', 'low']) {
  const r = await measure(q);
  console.log(
    `context=${q === 'high' ? 'MSAA on (antialias:true, as main)' : 'MSAA off (fix default on software)'} samples=${r.msaaSamples} canvas=${r.canvas.join('x')}css units=${r.units} unitShareOfFrame=${Math.round(r.unitShareHigh * 100)}%`,
  );
  for (const [name, v] of Object.entries(r.out)) {
    const ms = med(v.ms);
    const ref = med(v.ref);
    console.log(
      `  ${name.padEnd(32)} ${ms.toFixed(1).padStart(6)} ms  (ref ${ref.toFixed(1)} ms, ${Math.round((ms / ref) * 100)}%)  ~${(1000 / ms).toFixed(0)} fps cap  calls=${v.calls} tris=${v.tris}`,
    );
  }
}
await browser.close();
