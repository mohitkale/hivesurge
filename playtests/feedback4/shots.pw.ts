import { test } from '@playwright/test';
import { openScreen, SCREENS } from '../../e2e/screens';

// Feedback round 4 screenshots: every meta screen at two phone sizes.
// TAG=before|after BASE=http://127.0.0.1:5190 npx playwright test -c playtests/feedback4/pw.config.ts
const TAG = process.env.TAG ?? 'after';
const ONLY = (process.env.SCREENS ?? '').split(',').filter(Boolean);
for (const vp of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
])
  test(`shots ${TAG} ${vp.width}x${vp.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(vp);
    await page.goto('/?battle=8&revive=force');
    await page.locator('.home').waitFor({ timeout: 30_000 });
    for (const s of SCREENS) {
      if (ONLY.length && !ONLY.includes(s.name)) continue;
      await openScreen(page, s);
      await page.screenshot({
        path: `playtests/feedback4/${TAG}/${s.name}-${vp.width}x${vp.height}.png`,
      });
    }
  });
