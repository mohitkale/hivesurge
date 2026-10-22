import { chromium } from '@playwright/test';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5182';
const SH = '/workspace/scratch/qa/shots/';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on(
  'console',
  (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.type() + ' ' + m.text()),
);
const log = (...a) => console.log('[qa]', ...a);
const click = (sel) => page.locator(sel).first().click({ force: true });
const wallet = async () => (await page.locator('.wallet').innerText()).replace(/\s+/g, ' ');
async function toHome() {
  for (let i = 0; i < 40; i++) {
    const home = await page.locator('.home').count();
    const modals = await page.locator('.modal').count();
    if (home && !modals) return true;
    const ad = await page.locator('.ad-modal').count();
    if (ad) {
      await page.waitForTimeout(700);
      continue;
    }
    if (await page.locator('[data-o="no"]').count()) {
      log('starter offer -> No thanks');
      await click('[data-o="no"]');
      await page.waitForTimeout(500);
      continue;
    }
    if (await page.locator('[data-card="cancel"]').count()) {
      log('checkout -> cancel');
      await click('[data-card="cancel"]');
      await page.waitForTimeout(800);
      continue;
    }
    for (const a of ['claim', 'collect', 'decline', 'home', 'back', 'open']) {
      if (await page.locator(`.modal [data-a="${a}"]`).count()) {
        log(
          'modal ->',
          a,
          (await page.locator('.modal').last().innerText()).replace(/\s+/g, ' ').slice(0, 140),
        );
        await click(`.modal [data-a="${a}"]`);
        break;
      }
    }
    await page.waitForTimeout(500);
  }
  return false;
}
async function battle(label, aim = true) {
  await click('[data-a=play]');
  await page.waitForTimeout(400);
  if (await page.locator('[data-a=go]').count()) await click('[data-a=go]');
  const W = 390,
    H = 844;
  await page.mouse.move(W / 2, H * 0.7);
  await page.mouse.down();
  await page.evaluate(() => {
    window.__f = 0;
    const f = () => {
      window.__f++;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const t0 = Date.now();
  let res = '';
  while (Date.now() - t0 < 150000) {
    const t = (Date.now() - t0) / 1000;
    await page.mouse.move(aim ? W / 2 + Math.sin(t * 1.3) * W * 0.25 : W / 2, H * 0.7);
    if (Math.floor(t * 2) % 10 === 0) await page.keyboard.press('KeyQ');
    if (process.env.FORCE_WIN && t > 8)
      await page.evaluate(() => {
        const w = window.__hsGame?.world;
        if (w && w.outcome === 'playing') w.nestHp = Math.min(w.nestHp, 1);
      });
    if (await page.locator('.modal [data-a]').count()) {
      res = (await page.locator('.modal').last().innerText()).replace(/\s+/g, ' ');
      break;
    }
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  const secs = (Date.now() - t0) / 1000;
  const f = await page.evaluate(() => window.__f);
  log(
    `${label}: ${secs.toFixed(0)} s, ~${(f / secs).toFixed(0)} fps (swiftshader), result: ${res.slice(0, 160)}`,
  );
  await page.screenshot({ path: SH + label + '-result.png' });
  return res;
}
const step = process.argv[2] ?? 'all';
await page.goto(BASE + '/?battle=8&level=clover-run');
await page.waitForSelector('.home');
await toHome();
log('boot wallet', await wallet());
log('ranks', (await page.locator('.rank-list').innerText()).replace(/\s+/g, ' '));
if (step === 'all' || step === 'battle') {
  await battle('b1');
  await toHome();
  log('after battle wallet', await wallet());
  log('ranks', (await page.locator('.rank-list').innerText()).replace(/\s+/g, ' '));
  log('challenges', (await page.locator('.ch-list').first().innerText()).replace(/\s+/g, ' '));
  log('chests', (await page.locator('.home').innerText()).match(/CHESTS \d\/4/i)?.[0]);
}
if (step === 'all' || step === 'event') {
  if (await page.locator('[data-a="event:play"]').count()) {
    await click('[data-a="event:play"]');
    await page.waitForTimeout(500);
    log(
      'event start screen',
      (await page.locator('#overlay').innerText()).replace(/\s+/g, ' ').slice(0, 200),
    );
    if (await page.locator('[data-a=go]').count()) await click('[data-a=go]');
    const W = 390,
      H = 844;
    await page.mouse.move(W / 2, H * 0.7);
    await page.mouse.down();
    const t0 = Date.now();
    let res = '';
    while (Date.now() - t0 < 150000) {
      const t = (Date.now() - t0) / 1000;
      await page.mouse.move(W / 2 + Math.sin(t * 1.3) * W * 0.25, H * 0.7);
      if (process.env.FORCE_WIN && t > 8)
        await page.evaluate(() => {
          const w = window.__hsGame?.world;
          if (w && w.outcome === 'playing') w.nestHp = Math.min(w.nestHp, 1);
        });
      if (await page.locator('.modal [data-a]').count()) {
        res = (await page.locator('.modal').last().innerText()).replace(/\s+/g, ' ');
        break;
      }
      await page.waitForTimeout(60);
    }
    await page.mouse.up();
    log('event result', res.slice(0, 200));
    await toHome();
    log(
      'banner',
      (
        await page
          .locator('.event-banner')
          .innerText()
          .catch(() => 'none')
      ).replace(/\s+/g, ' '),
    );
  } else log('no live event on home');
}
if (step === 'all' || step === 'shop') {
  const w0 = await wallet();
  await click('[data-a=shop]');
  await page.waitForSelector('[data-a="buy:gems_small"]');
  await click('[data-a="buy:gems_small"]');
  await page.waitForSelector('[data-card="4000000000000002"]');
  await click('[data-card="4000000000000002"]');
  await page.waitForTimeout(1500);
  log(
    'after 0002 decline:',
    (await page.locator('.modal').last().innerText()).replace(/\s+/g, ' ').slice(0, 160),
  );
  await toHome();
  log('wallet', w0, '->', await wallet());
  await click('[data-a=shop]');
  await page.waitForSelector('[data-a="buy:gems_small"]');
  await click('[data-a="buy:gems_small"]');
  await page.waitForSelector('[data-card="4242424242424242"]');
  await click('[data-card="4242424242424242"]');
  await page.waitForTimeout(2500);
  log(
    'after 4242:',
    (await page.locator('.modal').last().innerText()).replace(/\s+/g, ' ').slice(0, 160),
  );
  await toHome();
  log('wallet after 4242', await wallet());
  await click('[data-a=shop]');
  await page.waitForSelector('[data-a="buy:season_pass"]');
  await click('[data-a="buy:season_pass"]');
  await page.waitForSelector('[data-card="4242424242424242"]');
  await click('[data-card="4242424242424242"]');
  await page.waitForTimeout(2500);
  await toHome();
  await click('[data-a=liveops]');
  await page.waitForTimeout(400);
  log(
    'pass premium buttons',
    await page.locator('[data-a^="tier:premium"]').count(),
    'locks',
    (await page.locator('.pass').innerText()).split('🔒').length - 1,
  );
  await click('[data-a=back]');
  await toHome();
  await click('[data-a=shop]');
  await page.waitForSelector('[data-a=restore]');
  await click('[data-a=restore]');
  await page.waitForTimeout(1500);
  log('restore:', (await page.locator('#overlay').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await toHome();
  log('wallet after restore', await wallet());
}
if (step === 'all' || step === 'account') {
  await click('[data-a=settings]');
  await page.waitForTimeout(300);
  await click('[data-a=account]');
  await page.waitForSelector('[data-a="acct:guest"]', { timeout: 10000 });
  await click('[data-a="acct:guest"]');
  await page.waitForTimeout(2000);
  log('account:', (await page.locator('#overlay').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  if (await page.locator('[data-a="acct:sync"]').count()) {
    await click('[data-a="acct:sync"]');
    await page.waitForTimeout(1500);
    log(
      'after sync:',
      (await page.locator('#overlay').innerText()).replace(/\s+/g, ' ').slice(0, 300),
    );
  }
  await toHome();
  log(
    'ranks (signed in mock)',
    (await page.locator('.rank-list').innerText()).replace(/\s+/g, ' '),
    '|',
    await page.locator('.rank-list').locator('xpath=..').locator('h3').innerText(),
  );
}
log('console errors/warnings:', errs.length ? '\n' + errs.join('\n') : 'none');
await browser.close();
