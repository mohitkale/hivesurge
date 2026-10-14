/* global process */
// PR 083 (fix/crowd-lod-hysteresis) design sign-off shots for the far crowd tier.
// node art/tools/crowd-lod-far-shots.mjs <dev-url> <out-dir>   (PUPPETEER_MODULE = puppeteer-core)
// 1. model-sheet.png from art/tools/crowd-lod-far-sheet.html.
// 2. Battle at ?stress=320 (high / low): a mixed bee + wasp clash is spawned beyond 0.6 L, the
//    far band is cropped (1x and x4). The wasp far mesh is swapped to the old bee-shaped
//    stand-in for the "before" crops. Writes battle-*.png and shots.json (unit px sizes).
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core');
import { writeFileSync, mkdirSync } from 'node:fs';
const [base = 'http://localhost:5184/', out = 'art/screenshots/crowd-lod-far'] =
  process.argv.slice(2);
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
const meta = {};
{
  const p = await b.newPage();
  await p.setViewport({ width: 1100, height: 1700 });
  await p.goto(`${base}art/tools/crowd-lod-far-sheet.html`, { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', { timeout: 120000 });
  const el = await p.$('#out');
  await el.screenshot({ path: `${out}/model-sheet.png` });
  await p.close();
}
const SKINS = ['classic', 'starter', 'blossom', 'sunny', 'maple', 'frost', 'lantern'];
const runs = [];
for (const quality of ['high', 'low']) {
  runs.push(
    { quality, skin: 'classic', wasp: 'before' },
    { quality, skin: 'classic', wasp: 'after' },
  );
  for (const skin of SKINS.slice(1)) runs.push({ quality, skin, wasp: 'after' });
}
for (const { quality, skin, wasp } of runs) {
  const p = await b.newPage();
  await p.setViewport({ width: 540, height: 960 }); // phone portrait: far units ~16-24 px
  await p.goto(`${base}?quality=${quality}`, { waitUntil: 'load' });
  await wait(500);
  await p.evaluate(
    (skins, eq) =>
      localStorage.setItem(
        'hivesurge.save.v1',
        JSON.stringify({
          version: 1,
          ftueDone: true,
          battlesCompleted: 1,
          skins,
          equippedSkin: eq,
        }),
      ),
    SKINS.slice(1),
    skin === 'classic' ? '' : skin,
  );
  await p.goto(`${base}?stress=320&quality=${quality}`, { waitUntil: 'load' });
  await wait(1500);
  for (let i = 0; i < 20 && (await p.$('.modal')); i++) {
    const el =
      (await p.$('[data-a=play]')) ?? (await p.$('[data-a=close]')) ?? (await p.$('[data-a=skip]'));
    if (el) await el.evaluate((x) => x.click());
    await wait(400);
  }
  await wait(3500);
  const info = await p.evaluate(async (wasp) => {
    const sc = window.__hsScene;
    const w = window.__hsGame.world;
    if (wasp === 'before') {
      const m = await import('/src/art/models.ts');
      const pal = await import('/src/art/palette.ts');
      sc.lod.waspFar.geometry = m.crowdFarGeometry(0.5, pal.ART.waspBody, pal.ART.waspBand);
    }
    // Force the crowd switch on for the shot (stress counts normally trip it; wasps on high only
    // above 160, which a single wave may not reach).
    for (const k of ['bees', 'wasps']) sc.crowdLod[k].update = () => true;
    // Freeze the sim (render keeps running) so the clash is captured as spawned, whatever the box load.
    w.step = () => {};
    const L = w.level.laneLength;
    const half = w.level.laneWidth / 2 - 0.6;
    // Mixed clash in the far band (> 0.6 L).
    for (let k = 0; k < 90; k++) {
      const x = -half + ((k * 0.61) % (2 * half));
      // Bees 0.62-0.71 L just below the wasps 0.73-0.82 L, so the lines are about to meet.
      const f = (k * 0.37) % 1;
      if (k % 2) w.wasps.spawn(2, x, L * (0.73 + f * 0.09));
      else w.bees.spawn(0, x, L * (0.62 + f * 0.09));
    }
    // Project the clash box and one unit's length to CSS px.

    const cam = sc.camera;
    const cv = sc.renderer.domElement;
    const rc = cv.getBoundingClientRect();
    const proj = (x, y, z) => {
      const v = new cam.position.constructor(x, z, -y).project(cam);
      return [rc.left + ((v.x + 1) / 2) * rc.width, rc.top + ((1 - v.y) / 2) * rc.height];
    };
    const tl = proj(-half - 0.5, L * 0.84, 0.8);
    const br = proj(half + 0.5, L * 0.6, 0);
    const u0 = proj(0, L * 0.72, 0.4);
    const u1 = proj(0.5, L * 0.72, 0.4); // 0.5 world units across
    return {
      L,
      crop: [tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]],
      // on-screen length of a far bee (bbox ~0.5 world units long at unit scale 0.42)
      unitPx: Math.abs(u1[0] - u0[0]),
      skin: sc.beeSkin?.id ?? 'classic',
    };
  }, wasp);
  await wait(150); // a few frames: spawned units drawn, sim frozen
  info.far = await p.evaluate(() => [
    window.__hsScene.lod.workerFar.count,
    window.__hsScene.lod.waspFar.count,
  ]);
  const [x, y, wd, h] = info.crop.map(Math.round);
  const name = `battle-${quality}-${skin}-wasp-${wasp}`;
  await p.screenshot({ path: `${out}/${name}-full.png` });
  await p.screenshot({ path: `${out}/${name}-farcrop.png`, clip: { x, y, width: wd, height: h } });
  meta[name] = info;
  console.log(name, JSON.stringify(info));
  await p.close();
}
writeFileSync(`${out}/shots.json`, JSON.stringify(meta, null, 2) + '\n');
await b.close();
