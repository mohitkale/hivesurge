/* eslint-env node */
/* global process */
// Headless e2e: grant starter (shop) -> open picker -> select -> battle. Screenshots to art/screenshots/skins/.
const puppeteer = (await import(process.env.PUPPETEER_MODULE)).default;
const url = process.argv[2] ?? 'http://localhost:4173/';
const out = 'art/screenshots/skins';
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 640 });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
// Skip the FTUE battle: mark a played save (same as a returning player).
await p.evaluate(() =>
  localStorage.setItem(
    'hivesurge.save.v1',
    JSON.stringify({ version: 1, ftueDone: true, battlesCompleted: 1 }),
  ),
);
await p.reload({ waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (a) => {
  await p.waitForSelector(`[data-a="${a}"]`, { timeout: 5000 });
  await p.click(`[data-a="${a}"]`);
  await wait(300);
};
const acts = () => p.$$eval('[data-a]', (e) => e.map((x) => x.dataset.a));
console.log('title', await acts(), (await p.$eval('body', (e) => e.innerText)).slice(0, 300));
await click('skins');
await p.screenshot({ path: `${out}/e2e-1-picker-before.png` });
console.log('picker before', await acts());
await click('back');
await click('shop');
await click('buy:starter_pack');
console.log('after buy', await acts());
for (const a of ['ok', 'confirm'])
  if ((await acts()).includes(a)) {
    await click(a);
    break;
  }
await wait(300);
console.log('after confirm', await acts());
if ((await acts()).includes('back')) await click('back');
await click('skins');
await p.screenshot({ path: `${out}/e2e-2-picker-owned.png` });
console.log('picker owned', await acts());
await click('skin:starter');
await p.screenshot({ path: `${out}/e2e-3-picker-selected.png` });
await click('back');
await p.screenshot({ path: `${out}/e2e-4-title.png` });
console.log(
  'saved',
  await p.evaluate(() =>
    Object.values(localStorage)
      .filter((v) => v.includes('selectedSkin'))
      .map((v) => JSON.parse(v).selectedSkin),
  ),
);
await click('play');
await wait(1500);
// Launch bees: hold on the lane, then capture mid-flight.
await p.bringToFront();
await p.keyboard.down('Space');
await p.mouse.move(450, 450);
await p.mouse.down();
await p.mouse.move(470, 440, { steps: 10 });
await wait(2500);
await p.screenshot({ path: `${out}/e2e-5-battle-starter.png` });
await p.mouse.up();
await p.keyboard.up('Space');
console.log(
  'worker tris',
  await p.evaluate(() => {
    const g = window.__hsScene?.bees?.worker?.geometry;
    return g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : null;
  }),
);
console.log('scene skin', await p.evaluate(() => window.__hsScene?.beeSkin?.id ?? null));
await b.close();
