/* global process */
// Gate label legibility check: 360 px wide viewport, reports on-screen label size.
// node art/tools/label-measure.mjs <dev-url> <screenshot.png>  (dev server: uses window.__hsScene)
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core');
const [url = 'http://localhost:5173/', out = 'art/screenshots/gates-360.png'] =
  process.argv.slice(2);
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const p = await b.newPage();
await p.setViewport({
  width: 360,
  height: 780,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await p.goto(url + (url.includes('?') ? '&' : '?') + 'reducedMotion=0', {
  waitUntil: 'networkidle0',
});
await p.click('[data-a=play]');
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: out });
const m = await p.evaluate(() => window.__hsScene.gateLabelPx());
console.log(JSON.stringify(m));
await b.close();
