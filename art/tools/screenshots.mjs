/* global process */
// Headless capture of the battle for art before/after comparison.
// Usage: node art/tools/screenshots.mjs <url> <outDir> <prefix>
// Needs puppeteer-core (set PUPPETEER_MODULE to its path if not installed locally).
const mod = process.env.PUPPETEER_MODULE ?? 'puppeteer-core';
const { default: puppeteer } = await import(mod);
const [url = 'http://localhost:5173/', out = 'art/screenshots', prefix = 'shot'] =
  process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await page.goto(url, { waitUntil: 'networkidle0' });
await page.click('[data-a=play]');
const W = 390,
  H = 844;
await page.mouse.move(W / 2, H * 0.7);
await page.mouse.down();
const start = Date.now();
const marks = [6, 14, 22];
let k = 0;
while (Date.now() - start < 26000 && k < marks.length) {
  const t = (Date.now() - start) / 1000;
  await page.mouse.move(W / 2 + Math.sin(t * 1.1) * W * 0.3, H * 0.7);
  if (t > marks[k]) {
    await page.screenshot({
      path: `${out}/${prefix}-battle-${String(marks[k]).padStart(2, '0')}s.png`,
    });
    k++;
  }
  if (await page.$('.modal')) break;
  await new Promise((r) => setTimeout(r, 50));
}
await page.mouse.up();
await browser.close();
console.log('done', k, 'shots');
