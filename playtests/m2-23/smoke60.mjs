import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844 });
const warnings = [];
const log = [];
p.on('console', (m) => {
  log.push(new Date().toISOString() + ' [' + m.type() + '] ' + m.text());
  if (/WebGL|texImage/i.test(m.text())) warnings.push(m.text());
});
await p.goto(url, { waitUntil: 'load' }); // fresh profile: FTUE boots into battle
const t0 = Date.now();
const box = await p.$eval('#game', (e) => {
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height * 0.8 };
});
await p.mouse.move(box.x, box.y);
await p.mouse.down();
let star = null,
  battles = 1;
while (Date.now() - t0 < 60000) {
  if ((await p.$eval('.ftue-prompt', (e) => e.textContent).catch(() => '')) === 'Tap the queen!')
    await p.keyboard.press('q');
  const btn = await p.$$eval('#overlay [data-a]', (bs) => bs.map((x) => x.dataset.a));
  if (btn.length) {
    await p.mouse.up();
    const s = await p
      .$eval('#overlay .stars', (e) => ({
        aria: e.getAttribute('aria-label'),
        lit: e.querySelectorAll('span:not(.off):not(.sr-only)').length,
      }))
      .catch(() => null);
    if (s && !star) star = s;
    const pick = ['claim', 'retry', 'play', 'home'].find((x) => btn.includes(x));
    if (pick) {
      await p.click(`#overlay [data-a="${pick}"]`);
      battles++;
      await new Promise((r) => setTimeout(r, 800));
      await p.mouse.move(box.x, box.y);
      await p.mouse.down();
    }
  }
  await new Promise((r) => setTimeout(r, 250));
}
for (const l of log) console.log(l);
console.log(
  'SUMMARY ' +
    JSON.stringify({
      commit: process.argv[3],
      seconds: 60,
      screensVisited: battles,
      webglWarnings: warnings.length,
      sample: warnings.slice(0, 2),
      star,
    }),
);
await b.close();
