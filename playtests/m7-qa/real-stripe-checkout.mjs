import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  storageState: '/workspace/scratch/qa/.state.json',
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const reqs = [];
page.on('response', (res) => {
  const u = new URL(res.url());
  if (!u.hostname.startsWith('127.'))
    reqs.push(res.request().method() + ' ' + u.hostname + u.pathname + ' ' + res.status());
});
const click = (s) => page.locator(s).first().click({ force: true });
const log = (...a) => console.log('[real]', ...a);
await page.goto('http://127.0.0.1:5173/?battle=8');
await page.waitForSelector('.home');
await page.waitForTimeout(3000);
// forced win (dev hook) to exercise league_submit
if (process.env.BATTLE) {
  await click('[data-a=play]');
  await page.waitForTimeout(400);
  if (await page.locator('[data-a=go]').count()) await click('[data-a=go]');
}
if (process.env.BATTLE)
  for (let i = 0; i < 200; i++) {
    await page.evaluate(() => {
      const w = window.__hsGame?.world;
      if (w && w.outcome === 'playing') w.nestHp = Math.min(w.nestHp, 1);
    });
    if (await page.locator('.modal [data-a]').count()) break;
    await page.waitForTimeout(100);
  }
for (let i = 0; i < 30; i++) {
  if ((await page.locator('.home').count()) && !(await page.locator('.modal').count())) break;
  if (await page.locator('.ad-modal').count()) {
    await page.waitForTimeout(700);
    continue;
  }
  if (await page.locator('[data-o="no"]').count()) {
    await click('[data-o="no"]');
    continue;
  }
  for (const a of ['claim', 'decline', 'home'])
    if (await page.locator(`.modal [data-a="${a}"]`).count()) {
      await click(`.modal [data-a="${a}"]`);
      break;
    }
  await page.waitForTimeout(500);
}
await page.waitForTimeout(4000);
log('rank label:', await page.locator('.home-sec h3').filter({ hasText: 'Rankings' }).innerText());
log('ranks after win:', (await page.locator('.rank-list').innerText()).replace(/\s+/g, ' '));
// Stripe test checkout from the shop
await click('[data-a=shop]');
await page.waitForSelector('[data-a="buy:gems_small"]');
await click('[data-a="buy:gems_small"]');
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
log('redirected to', new URL(page.url()).hostname);
await page.waitForTimeout(8000);
await page.screenshot({
  path: '/workspace/scratch/qa/shots/10-stripe-checkout.png',
  fullPage: true,
});
log(
  'inputs:',
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('input,button,select')]
        .map(
          (e) =>
            e.id || e.name || e.getAttribute('data-testid') || e.textContent.trim().slice(0, 30),
        )
        .slice(0, 40),
    ),
  ),
);
log(
  'frames:',
  page
    .frames()
    .map((f) => new URL(f.url() || 'about:blank').hostname)
    .join(','),
);
await page.getByText('Card', { exact: true }).first().click({ timeout: 15000 });
await page.waitForSelector('#cardNumber', { timeout: 30000 });
await page.screenshot({ path: '/workspace/scratch/qa/shots/10-stripe-checkout.png' });
const email = page.locator('#email');
if ((await email.count()) && (await email.isEditable()))
  await email.fill('qa-m7-headless@example.invalid');
await page.fill('#cardNumber', '4242424242424242');
await page.fill('#cardExpiry', '12 / 34');
await page.fill('#cardCvc', '123');
const name = page.locator('#billingName');
if (await name.count()) await name.fill('QA Headless');
const country = page.locator('#billingCountry');
if (await country.count()) await country.selectOption('US').catch(() => {});
const zip = page.locator('#billingPostalCode');
if ((await zip.count()) && (await zip.isVisible())) await zip.fill('10001');
await page.screenshot({ path: '/workspace/scratch/qa/shots/11-stripe-filled.png' });
await page.locator('button[type=submit], .SubmitButton').first().click();
await page.waitForURL(/127\.0\.0\.1:5173/, { timeout: 60000 });
log('returned:', page.url().replace(/session_id=cs_test_\w+/, 'session_id=cs_test_…'));
for (let i = 0; i < 40; i++) {
  const t = await page
    .locator('#overlay')
    .innerText()
    .catch(() => '');
  if (/Gems|💎 1\d\d|granted|arrive|Restored/i.test(t) && (await page.locator('.wallet').count()))
    break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(3000);
log(
  'overlay after return:',
  (await page.locator('#overlay').innerText()).replace(/\s+/g, ' ').slice(0, 300),
);
await page.screenshot({ path: '/workspace/scratch/qa/shots/12-after-return.png' });
log(
  'ext calls:',
  JSON.stringify([
    ...new Set(
      reqs.filter(
        (x) =>
          !/stripe\.com\/(v1|b\/|api)|m\.stripe|r\.stripe|js\.stripe|q\.stripe|hcaptcha|fonts|stripecdn/.test(
            x,
          ),
      ),
    ),
  ]),
);
log(
  'errors:',
  errs.filter((e) => !/stripe|hcaptcha|Content Security|Permissions-Policy/i.test(e)).join('\n') ||
    'none',
);
await ctx.storageState({ path: '/workspace/scratch/qa/.state.json' });
await browser.close();
