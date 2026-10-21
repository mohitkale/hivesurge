import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, role = 'owner') {
  await page.goto(`/admin?mock=1&role=${role}`);
  await expect(page.getByTestId('sandbox-banner')).toContainText('SANDBOX');
  await page.getByRole('button', { name: 'Sign in (mock)' }).click();
}

test.beforeEach(({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('owner: lookup, player detail, audited grant, ledger', async ({ page }) => {
  await signIn(page);
  await expect(page.getByTestId('role')).toHaveText('owner');
  const rows = page.getByTestId('players').locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(10);
  await rows.first().locator('a').first().click();
  await expect(page.getByTestId('player')).toBeVisible();
  const coins = Number(await page.getByTestId('coins').textContent());
  await page.locator('[data-form=grant] [name=coins]').fill('250');
  await page.locator('[data-form=grant] [name=gems]').fill('10');
  await page.locator('[data-form=grant] [name=reason]').fill('QA smoke grant');
  await page.getByTestId('grant').click();
  await expect(page.getByTestId('action-msg')).toContainText('Granted');
  await expect(page.getByTestId('coins')).toHaveText(String(coins + 250));
  await expect(page.getByTestId('ledger')).toContainText('admin:1');
  await expect(page.getByTestId('player').getByTestId('audit')).toContainText('QA smoke grant');
  await page.getByTestId('nav-audit').click();
  await expect(page.getByTestId('audit')).toContainText('grant');
});

test('stats dashboard renders funnel, pacing and TEST revenue from seeded events', async ({
  page,
}) => {
  await signIn(page, 'viewer');
  await page.getByTestId('nav-stats').click();
  await expect(page.getByTestId('chart-level-funnel').locator('rect').first()).toBeVisible();
  await expect(page.getByTestId('funnel')).toContainText('ftue-meadow');
  await expect(page.getByTestId('chart-ftue-funnel')).toBeVisible();
  await expect(page.getByTestId('ads')).toContainText('win_double');
  await expect(page.getByTestId('chart-sandbox-revenue-test-')).toBeVisible();
  await page.getByTestId('nav-purchases').click();
  await expect(page.getByTestId('purchases').locator('tbody tr').first()).toBeVisible();
  await expect(page.getByText('TEST MODE ONLY')).toBeVisible();
});

test('remote config: publish check blocks bad odds and over-cap ads; valid publish goes live', async ({
  page,
}) => {
  await signIn(page, 'owner');
  await page.getByTestId('nav-config').click();
  await expect(page.getByTestId('live-version')).toHaveText('v1');
  const box = page.getByTestId('config-json');
  const cfg = JSON.parse(await box.inputValue());
  cfg.chests.gold.odds.L = 3;
  cfg.ads.interstitialPerSession = 6;
  await box.fill(JSON.stringify(cfg, null, 2));
  await page.getByTestId('validate').click();
  await expect(page.getByTestId('config-errors')).toContainText('sum to 100');
  await expect(page.getByTestId('config-errors')).toContainText('interstitialPerSession');
  await expect(page.getByTestId('publish')).toBeDisabled();
  cfg.chests.gold.odds.L = 2;
  cfg.ads.interstitialPerSession = 3;
  await page.getByTestId('config-json').fill(JSON.stringify(cfg, null, 2));
  await page.getByTestId('validate').click();
  await expect(page.getByTestId('config-ok')).toBeVisible();
  await expect(page.getByTestId('config-diff')).toContainText('ads.interstitialPerSession: 4 → 3');
  await page.getByTestId('publish').click();
  await expect(page.getByTestId('config-msg')).toContainText('Published v2');
  await expect(page.getByTestId('live-version')).toHaveText('v2');
});

test('levels: view shipped data, reject invalid JSON, save a valid row', async ({ page }) => {
  await signIn(page, 'liveops');
  await page.getByTestId('nav-levels').click();
  await page.getByRole('link', { name: 'clover-run' }).click();
  const box = page.getByTestId('level-json');
  const lvl = JSON.parse(await box.inputValue());
  expect(lvl.id).toBe('clover-run');
  await box.fill(JSON.stringify({ ...lvl, nestHp: -5 }));
  await page.getByTestId('check-level').click();
  await expect(page.getByTestId('level-errors')).toContainText('nestHp');
  await page
    .getByTestId('level-json')
    .fill(JSON.stringify({ ...lvl, nestHp: lvl.nestHp + 10 }, null, 2));
  await page.locator('[data-form=level] [name=reason]').fill('tune clover nest');
  await page.getByTestId('save-level').click();
  await expect(page.getByTestId('level-msg')).toContainText('Saved level row clover-run v1');
});

test('viewer cannot write; non-admin gets 403', async ({ page }) => {
  await signIn(page, 'viewer');
  await page.getByTestId('players').locator('tbody tr a').first().click();
  await expect(page.getByTestId('grant')).toBeDisabled();
  await expect(page.getByTestId('reset')).toBeDisabled();
  await signIn(page, 'none');
  await expect(page.getByTestId('forbidden')).toContainText('403');
});

test('the player game page does not load admin code', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(urls.filter((u) => u.includes('/src/admin/'))).toEqual([]);
});
