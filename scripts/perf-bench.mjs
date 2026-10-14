import { readdirSync, readFileSync } from 'node:fs';
// Low-end perf bench (fix/perf-lowend): headless Chrome on SwiftShader (software WebGL, no GPU).
// node scripts/perf-bench.mjs <url> [seconds=60] [label]
// Plays real battles (hold + weave the pointer, click through result screens) and reports
// fps from a page-side rAF probe, renderer stats and pointer latency:
//   handler = event timeStamp -> listener runs (main-thread queueing),
//   frame   = event timeStamp -> next animation frame (when the input can first be drawn).
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core');
const [url, secs = '60', label = ''] = process.argv.slice(2);
const W = Number(process.env.BENCH_W ?? 1280);
const H = Number(process.env.BENCH_H ?? 800);
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
// CPU seconds used by this browser's whole process tree (GPU process = SwiftShader).
// Per frame, this cost is far less sensitive to other load on a shared box than wall fps.
function treeCpuSec() {
  const root = browser.process()?.pid;
  const procs = {};
  for (const d of readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try {
      const f = readFileSync(`/proc/${d}/stat`, 'utf8');
      const rest = f.slice(f.lastIndexOf(')') + 2).split(' ');
      procs[d] = { ppid: rest[1], cpu: (Number(rest[11]) + Number(rest[12])) / 100 };
    } catch {
      /* exited */
    }
  }
  const inTree = (pid) => {
    for (let p = pid, i = 0; p && i < 20; p = procs[p]?.ppid, i++)
      if (Number(p) === root) return true;
    return false;
  };
  return Object.entries(procs).reduce((a, [pid, v]) => a + (inTree(pid) ? v.cpu : 0), 0);
}
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  const p = { frames: [], handler: [], frame: [], pending: [], longTasks: [] };
  new PerformanceObserver((l) => {
    if (p.on) for (const e of l.getEntries()) p.longTasks.push(e.duration);
  }).observe({ type: 'longtask', buffered: false });
  window.__bench = p;
  const loop = (t) => {
    if (p.on) p.frames.push(t);
    for (const ts of p.pending) p.frame.push(t - ts);
    p.pending.length = 0;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  addEventListener(
    'pointermove',
    (e) => {
      if (!p.on) return;
      p.handler.push(performance.now() - e.timeStamp);
      p.pending.push(e.timeStamp);
    },
    true,
  );
});
const click = (sel) =>
  page
    .$eval(sel, (b) => b.click())
    .then(
      () => true,
      () => false,
    );
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
async function toBattle() {
  for (let i = 0; i < 40 && (await page.$('.modal')); i++) {
    if (await click('[data-a=play]')) break;
    for (const a of ['claim', 'noThanks', 'next', 'retry', 'home', 'close', 'back', 'skip'])
      if (await click(`[data-a=${a}]`)) break;
    await sleep(300);
  }
}
await toBattle();
await sleep(3000); // warm-up: shader compile, deferred GLBs, quality settle
await page.evaluate(() => (window.__bench.on = true));
const cpu0 = treeCpuSec();
await page.mouse.move(W / 2, H * 0.7);
await page.mouse.down();
const t0 = Date.now();
let battles = 1;
while (Date.now() - t0 < Number(secs) * 1000) {
  const t = (Date.now() - t0) / 1000;
  await page.mouse.move(W / 2 + Math.sin(t * 1.3) * W * 0.25, H * 0.7);
  if (await page.$('.modal')) {
    await page.mouse.up();
    await toBattle();
    battles++;
    await page.mouse.move(W / 2, H * 0.7);
    await page.mouse.down();
  }
  await sleep(100);
}
await page.mouse.up();
const cpuSec = treeCpuSec() - cpu0;
const r = await page.evaluate(() => {
  const p = window.__bench;
  p.on = false;
  const f = p.frames;
  const d = f.slice(1).map((t, i) => t - f[i]);
  const s = (a) => [...a].sort((x, y) => x - y);
  const q = (a, k) => (a.length ? s(a)[Math.min(a.length - 1, Math.floor(a.length * k))] : NaN);
  const sc = window.__hsScene;
  const info = sc ? sc.renderer.info.render : null;
  const g = window.__hsGame;
  return {
    frames: d.length,
    longFrames: d.filter((x) => x > 100).length,
    longFrameMsTotal: Math.round(d.filter((x) => x > 100).reduce((a, b) => a + b, 0)),
    mainLongTasks: p.longTasks.length,
    mainLongTaskMs: Math.round(p.longTasks.reduce((a, b) => a + b, 0)),
    avgFps: (d.length * 1000) / (f[f.length - 1] - f[0]),
    medianFps: 1000 / q(d, 0.5),
    p1LowFps: 1000 / q(d, 0.99),
    handlerMedMs: q(p.handler, 0.5),
    handlerP95Ms: q(p.handler, 0.95),
    toFrameMedMs: q(p.frame, 0.5),
    toFrameP95Ms: q(p.frame, 0.95),
    inputs: p.handler.length,
    calls: info?.calls,
    triangles: info?.triangles,
    pixelRatio: sc?.renderer.getPixelRatio(),
    tier: g?.qualityTier ?? null,
    units: g ? g.world.bees.count + g.world.wasps.count : null,
  };
});
r.cpuMsPerFrame = (cpuSec * 1000) / r.frames;
r.loadavg = readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join('/');
const fmt = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);
console.log(
  [
    `label=${label}`,
    `url=${url}`,
    `renderer=${renderer}`,
    `viewport=${W}x${H}`,
    `secs=${secs}`,
    `battles=${battles}`,
  ]
    .concat(Object.entries(r).map(([k, v]) => `${k}=${fmt(v)}`))
    .join(' '),
);
await browser.close();
