import puppeteer from 'puppeteer-core';
const out = '/workspace/hivesurge/playtests/screenshots/m1';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const t0 = Date.now();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
console.log('loaded ms', Date.now() - t0);
await page.screenshot({ path: `${out}/mobile-01-title.png` });
await page.click('[data-a=play]');
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${out}/mobile-02-battle-start.png` });
// Hold the mouse and sweep left/right (skilled-ish player)
const W = 390,
  H = 844;
await page.mouse.move(W / 2, H * 0.7);
await page.mouse.down();
let shot = 3;
const start = Date.now();
while (Date.now() - start < 40000) {
  const t = (Date.now() - start) / 1000;
  const x = W / 2 + Math.sin(t * 1.1) * W * 0.32;
  await page.mouse.move(x, H * 0.7);
  if (Math.floor(t) % 8 === 0) await page.keyboard.press('KeyQ');
  if (t > 12 && shot === 3) {
    await page.screenshot({ path: `${out}/mobile-03-swarm.png` });
    shot++;
  }
  if (t > 25 && shot === 4) {
    await page.screenshot({ path: `${out}/mobile-04-clash.png` });
    shot++;
  }
  const over = await page.$('.modal');
  if (over) break;
  await new Promise((r) => setTimeout(r, 50));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 1200));
console.log('battle secs', (Date.now() - start) / 1000);
await page.screenshot({ path: `${out}/mobile-05-result.png` });
console.log('result text:', await page.$eval('.modal', (e) => e.innerText).catch(() => 'none'));
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0;
      const s = performance.now();
      const f = () => {
        n++;
        if (performance.now() - s < 1000) requestAnimationFrame(f);
        else res(n);
      };
      requestAnimationFrame(f);
    }),
);
console.log('fps(headless swiftshader)', fps);
console.log(logs.join('\n'));
await browser.close();
