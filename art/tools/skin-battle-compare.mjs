/* global process */
// Side-by-side battle check for a paid skin vs Classic on high and ?quality=low (QA PR 069).
// Seeds a save that owns the skin, equips classic / the skin, plays, launches bees and crops the
// swarm. Writes <out>/<skin>-<quality>-<equipped>.png crops; compose with skin-battle-compare.py.
// Usage: node art/tools/skin-battle-compare.mjs <dev-url> <skin> <out-dir>
const puppeteer = (await import(process.env.PUPPETEER_MODULE)).default;
const [base = 'http://localhost:5179/', skin = 'starter', out = 'art/screenshots/skins/compare'] =
  process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const quality of ['high', 'low'])
  for (const equipped of ['classic', skin]) {
    const p = await b.newPage();
    await p.setViewport({ width: 540, height: 960 });
    const url = `${base}?quality=${quality}`;
    await p.goto(url, { waitUntil: 'load' });
    await wait(600);
    await p.evaluate(
      (sk, eq) =>
        localStorage.setItem(
          'hivesurge.save.v1',
          JSON.stringify({
            version: 1,
            ftueDone: true,
            battlesCompleted: 1,
            skins: [sk],
            equippedSkin: eq === 'classic' ? '' : eq,
          }),
        ),
      skin,
      equipped,
    );
    await p.reload({ waitUntil: 'load' });
    await wait(1200);
    await p.click('[data-a="play"]');
    await wait(1200);
    await p.keyboard.down('Space');
    await p.mouse.move(270, 700);
    await p.mouse.down();
    await p.mouse.move(275, 695, { steps: 5 });
    await wait(3200);
    const id = await p.evaluate(() => window.__hsScene?.beeSkin?.id ?? 'classic');
    await p.screenshot({
      path: `${out}/${skin}-${quality}-${equipped}.png`,
      clip: { x: 150, y: 380, width: 240, height: 420 },
    });
    console.log(quality, equipped, 'scene skin', id);
    await p.close();
  }
await b.close();
