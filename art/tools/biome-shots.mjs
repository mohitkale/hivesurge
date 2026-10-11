/* global process */
// Biome screenshots from a SECOND battle (GLBs load after battle 1; PR 032).
// node art/tools/biome-shots.mjs <dev-url> <outDir>   (PUPPETEER_MODULE = path to puppeteer-core)
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core');
const [base = 'http://localhost:5173/', out = 'art/screenshots/biomes'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = {
  m360: { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
};
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
async function click(page, sel) {
  const el = await page.$(sel);
  if (!el) return false;
  await el.evaluate((b) => b.click());
  return true;
}
async function holdFire(page, vw, ms) {
  const { width: W, height: H } = vw;
  await page.mouse.move(W / 2, H * 0.7);
  await page.mouse.down();
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const t = (Date.now() - t0) / 1000;
    await page.mouse.move(W / 2 + Math.sin(t * 1.1) * Math.min(W, 500) * 0.3, H * 0.7);
    if (await page.$('.modal')) break;
    await sleep(60);
  }
  await page.mouse.up();
}
for (const biome of ['clover', 'orchard'])
  for (const assets of ['on', 'off'])
    for (const [vname, vw] of Object.entries(VIEWS)) {
      const ctx = await browser.createBrowserContext(); // fresh save each run
      const page = await ctx.newPage();
      page.on('pageerror', (e) => console.log('pageerror', e.message));
      await page.setViewport(vw);
      const q = `?biome=${biome}${assets === 'off' ? '&assets=off' : ''}`;
      await page.goto(base + q, { waitUntil: 'networkidle0' });
      await click(page, '[data-a=play]');
      // Battle 1: play until the result modal (FTUE battle on a fresh save).
      for (let i = 0; i < 6 && !(await page.$('.modal')); i++) await holdFire(page, vw, 15000);
      // Leave the result screen and start battle 2.
      for (let i = 0; i < 12; i++) {
        if (await click(page, '[data-a=play]')) break;
        for (const a of ['claim', 'noThanks', 'home', 'close', 'back'])
          if (await click(page, `[data-a=${a}]`)) break;
        await sleep(400);
      }
      await sleep(800);
      await holdFire(page, vw, 7000);
      const info = await page.evaluate(() => ({
        glb: window.__hsScene?.glbUsed ?? null,
      }));
      const file = `${out}/${biome}-${vname}-assets-${assets}.png`;
      await page.screenshot({ path: file });
      console.log(file, JSON.stringify(info));
      await ctx.close();
    }
await browser.close();
