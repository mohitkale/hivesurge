import { expect, test } from '@playwright/test';
import { auditScroll, openScreen, SCREENS, VIEWPORTS } from './screens';

// Feedback round 4: no native scrollbar anywhere, no page-level scrolling, and every scroll
// track that overflows carries a fade-edge hint. Every meta screen at 3 phones + desktop.
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    // Headless Chrome hides scrollbars by default; draw them so a real bar would be caught.
    ignoreDefaultArgs: ['--hide-scrollbars'],
  },
});

for (const vp of VIEWPORTS)
  test(`no visible scrollbars at ${vp.width}x${vp.height}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(vp);
    page.on('pageerror', (e) => {
      throw e;
    });
    await page.goto('/?battle=8&revive=force');
    await expect(page.locator('.home')).toBeVisible({ timeout: 30_000 });
    const issues: string[] = [];
    for (const s of SCREENS) {
      await openScreen(page, s);
      for (const i of await page.evaluate(auditScroll))
        issues.push(`${s.name}: ${i.what} on ${i.el}`);
    }
    expect(issues).toEqual([]);
  });
