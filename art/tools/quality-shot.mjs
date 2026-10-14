/* global process */
// Bee vs wasp readability per quality tier (art/PERF-AUDIT.md). Seeds a post-FTUE save, plays,
// launches bees into the stress swarm and saves a full shot + a 3x crop of the clash zone.
// Usage: node art/tools/quality-shot.mjs <dev-url> <quality> <out-prefix>
const puppeteer = (await import(process.env.PUPPETEER_MODULE)).default;
const [base = 'http://localhost:5181/', quality = 'low', out = 'art/screenshots/perf/q', lod = ''] =
  process.argv.slice(2);
const tag = lod ? `${quality}-lod` : quality;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
await p.setViewport({ width: 540, height: 960 });
await p.goto(`${base}?stress=200&quality=${quality}`, { waitUntil: 'load' });
await wait(800);
await p.evaluate(() =>
  localStorage.setItem(
    'hivesurge.save.v1',
    JSON.stringify({ version: 1, ftueDone: true, battlesCompleted: 1 }),
  ),
);
await p.reload({ waitUntil: 'load' });
await wait(1200);
await p.click('[data-a="play"]');
await wait(1500);
if (lod)
  // Proposal preview only: swap the worker mesh to the crowd LOD (eng owns the real switch).
  console.log(
    'lod tris',
    await p.evaluate(async () => {
      const { beeCrowdGeometry } = await import('/src/art/models.ts');
      const w = window.__hsScene.bees.worker;
      w.geometry = beeCrowdGeometry(0.42);
      return w.geometry.index.count / 3;
    }),
  );
await p.keyboard.down('Space');
await p.mouse.move(270, 700);
await p.mouse.down();
await p.mouse.move(280, 690, { steps: 10 });
await wait(5000);
await p.screenshot({ path: `${out}-${tag}.png` });
await p.screenshot({
  path: `${out}-${tag}-crop.png`,
  clip: { x: 120, y: 200, width: 300, height: 300, scale: 2 },
});
console.log(quality, await p.evaluate(() => window.__hsScene?.quality ?? null));
await b.close();
