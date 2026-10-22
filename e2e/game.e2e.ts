import { expect, test, type Page } from '@playwright/test';

// M7 QA (playtests/m7-qa-2026-10-22.md): guest game smoke in mock mode (zero env vars).
// No battle here (SwiftShader battles are slow); battles run in playtests/m7-qa/mock-pass.mjs.
test.use({
  viewport: { width: 390, height: 844 },
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

const tap = (page: Page, sel: string) => page.locator(sel).first().click({ force: true });
const gems = async (page: Page) =>
  Number(/💎\s*(\d+)/.exec(await page.locator('.wallet').innerText())?.[1] ?? NaN);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
  await page.goto('/?battle=8');
  await expect(page.locator('.home')).toBeVisible({ timeout: 30_000 });
});

test('home: offline league with labelled bots, real daily challenges', async ({ page }) => {
  await expect(page.locator('.home')).toContainText('offline, bots labelled');
  const rows = page.locator('.rank-list li');
  await expect(rows).toHaveCount(5);
  const texts = await rows.allInnerTexts();
  expect(texts.filter((t) => t.includes('You'))).toHaveLength(1);
  for (const t of texts.filter((x) => !x.includes('You'))) expect(t).toContain('(bot)');
  await expect(page.locator('.ch-list').first()).toContainText('Win battles');
});

test('Targets & Pass: daily, weekly, events calendar, season pass', async ({ page }) => {
  await tap(page, '[data-a=liveops]');
  const s = page.locator('.liveops-screen');
  await expect(s).toContainText('Today');
  await expect(s).toContainText('This week');
  await expect(s).toContainText('Events calendar');
  await expect(s).toContainText('Season pass');
  await tap(page, '.liveops-screen [data-a=back]');
  await expect(page.locator('.home')).toBeVisible();
});

test('shop: mock Stripe 0002 declines with no grant, 4242 grants 120 gems once', async ({
  page,
}) => {
  const g0 = await gems(page);
  await tap(page, '[data-a=shop]');
  await tap(page, '[data-a="buy:gems_small"]');
  await tap(page, '[data-card="4000000000000002"]');
  await expect(page.locator('.checkout-mock')).toContainText('declined');
  await tap(page, '[data-card="cancel"]');
  await expect(page.locator('[data-a="buy:gems_small"]')).toBeVisible();
  await tap(page, '[data-a="buy:gems_small"]');
  await tap(page, '[data-card="4242424242424242"]');
  await expect(page.locator('.checkout-mock')).toHaveCount(0);
  await tap(page, '[data-a=restore]');
  await expect(page.locator('#overlay')).toContainText(/restored/i);
  await tap(page, '[data-a=back]');
  await expect.poll(() => gems(page)).toBe(g0 + 120);
});

test('account: guest cloud save on the mock cloud, sync now', async ({ page }) => {
  await tap(page, '[data-a=settings]');
  await tap(page, '[data-a=account]');
  await expect(page.locator('#overlay')).toContainText('MOCK CLOUD');
  await tap(page, '[data-a="acct:guest"]');
  await expect(page.locator('#overlay')).toContainText('Cloud save: on');
  await tap(page, '[data-a="acct:sync"]');
  await expect(page.locator('#overlay')).toContainText('Synced');
});
