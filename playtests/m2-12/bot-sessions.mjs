// M2-12 bot sessions (research/m2-12-local-playtest-protocol.md §4). BOT DATA, NEVER PLAYER DATA.
// Usage: node playtests/m2-12/bot-sessions.mjs [--url http://127.0.0.1:4173/] [--profiles idle,sweeper,gate-seeker]
//        [--runs 5] [--max-battles 10] [--max-min 15] [--out playtests/m2-12]
// Needs a running `npx vite preview --host 127.0.0.1 --port 4173` and Chrome at /usr/bin/google-chrome.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}
const url = arg('url', 'http://127.0.0.1:4173/');
const profiles = arg('profiles', 'idle,sweeper,gate-seeker').split(',');
const runs = Number(arg('runs', '5'));
const maxBattles = Number(arg('max-battles', '10'));
const maxMs = Number(arg('max-min', '15')) * 60_000;
const out = resolve(arg('out', 'playtests/m2-12'));
const chrome = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
mkdirSync(out, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Aim x in [0, 1] of the lane width for this profile at time t (s). */
function aimFor(profile, t) {
  if (profile === 'sweeper') return 0.5 + 0.35 * Math.sin(t * 1.3);
  // gate-seeker: gate positions are not exposed in the DOM, so it falls back to the
  // sweeper with a centre bias (the FTUE x2 gate and most first-row gates sit near centre).
  return 0.5 + 0.2 * Math.sin(t * 0.9);
}

export function fpsSummary(frames) {
  const s = [...frames].filter((f) => f > 0).sort((a, b) => a - b);
  if (!s.length) return { frames: 0, medianFps: null, low1Fps: null, over50msPct: null };
  const med = s[Math.floor(s.length / 2)];
  const p99 = s[Math.min(s.length - 1, Math.floor(s.length * 0.99))];
  return {
    frames: s.length,
    medianFps: Math.round(10000 / med) / 10,
    low1Fps: Math.round(10000 / p99) / 10,
    over50msPct: Math.round((s.filter((f) => f > 50).length / s.length) * 1000) / 10,
  };
}

async function runSession(profile, n) {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  // 390x844 portrait. Mouse input (hasTouch false) so press/drag maps to the unified input.
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: false,
  });
  // fps sampler: records every rAF delta (ms) from page start; swiftshader = software GL, so
  // these numbers are a floor for the box, not a phone measurement.
  await page.evaluateOnNewDocument(() => {
    window.__m212Frames = [];
    let last = performance.now();
    const tick = (now) => {
      window.__m212Frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  const t0 = Date.now();
  let battles = 0;
  let retriesLeft = 3;
  let holding = false;
  let inBattle = false;
  const box = async () =>
    page.$eval('#game', (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
  while (Date.now() - t0 < maxMs) {
    const btns = await page.$$eval('#overlay [data-a]:not([disabled])', (bs) =>
      bs.map((b) => b.dataset.a),
    );
    const adOpen = (await page.$('.ad-modal')) !== null;
    if (adOpen) {
      await sleep(500);
      continue;
    }
    if (btns.length) {
      if (holding) {
        await page.mouse.up();
        holding = false;
      }
      if (inBattle) {
        inBattle = false;
        battles++;
      }
      if (battles >= maxBattles) break;
      let click = null;
      if (btns.includes('play')) click = 'play';
      else if (btns.includes('retry') && retriesLeft > 0) {
        click = 'retry';
        retriesLeft--;
      } else if (btns.includes('home')) click = 'home';
      else if (btns.includes('claim')) {
        click = 'claim'; // "No thanks" / "Collect": bots never watch rewarded ads
        retriesLeft = 3;
      }
      if (click) {
        await page.click(`#overlay [data-a="${click}"]`).catch(() => {});
        await sleep(600);
        continue;
      }
      await sleep(300);
      continue;
    }
    // In battle (FTUE boots straight into one on first launch).
    inBattle = true;
    if (profile !== 'idle') {
      const b = await box();
      const t = (Date.now() - t0) / 1000;
      const x = b.x + b.w * aimFor(profile, t);
      const y = b.y + b.h * 0.8;
      if (!holding) {
        await page.mouse.move(x, y);
        await page.mouse.down();
        holding = true;
      } else await page.mouse.move(x, y);
      if (Math.floor(t * 2) % 6 === 0) await page.keyboard.press('q'); // queen when ready
    }
    await sleep(150);
  }
  const events = await page.evaluate(() => localStorage.getItem('hivesurge.analytics.v1') ?? '[]');
  const file = join(out, `bot-${profile}-${n}.json`);
  writeFileSync(file, JSON.stringify(JSON.parse(events), null, 1));
  const frames = await page.evaluate(() => window.__m212Frames.slice(60)); // skip boot frames
  writeFileSync(join(out, `fps-bot-${profile}-${n}.json`), JSON.stringify(fpsSummary(frames)));
  await browser.close();
  return { file, battles, minutes: (Date.now() - t0) / 60000, errors };
}

for (const p of profiles)
  for (let n = 1; n <= runs; n++) {
    const r = await runSession(p, n);
    console.log(
      `${p} #${n}: ${r.battles} battles in ${r.minutes.toFixed(1)} min -> ${r.file}` +
        (r.errors.length ? ` (page errors: ${r.errors.join(' | ')})` : ''),
    );
  }
