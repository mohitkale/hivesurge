import { test } from '@playwright/test';

// Feedback round 4 #3 proof: a blocker's count goes down live and the pane shatters at 0.
// BASE=http://127.0.0.1:5191 npx playwright test -c playtests/feedback4/pw.config.ts countdown
type Gv = { counter?: { shown: number; state: string; gate: { value: number } } };
const OUT = 'playtests/feedback4/after';

test('blocker countdown and shatter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?battle=8&level=thistle-gauntlet');
  await page.locator('.home').waitFor({ timeout: 30_000 });
  await page.evaluate(() => {
    const g = (window as unknown as { __hsGame: Record<string, unknown> }).__hsGame as {
      startBattle: () => void;
      input: { aimX: number; firing: boolean; update: () => void };
    };
    g.startBattle();
    // Hold fire at the −40 blocker (x −1.3, behind the +5 gate).
    g.input.update = () => {};
    g.input.aimX = -1.3;
    g.input.firing = true;
  });
  const blocker = () =>
    page.evaluate(() => {
      const s = (window as unknown as { __hsScene: { gates: Gv[] } }).__hsScene;
      const c = s.gates.find((v) => v.counter && v.counter.gate.value === 40)?.counter;
      return c ? { shown: c.shown, state: c.state } : null;
    });
  await page.screenshot({ path: `${OUT}/countdown-0-full.png` });
  let shotMid = false;
  for (let k = 0; k < 600; k++) {
    const b = await blocker();
    if (!b) break;
    if (!shotMid && b.shown <= 28 && b.shown > 0) {
      await page.screenshot({ path: `${OUT}/countdown-1-mid.png` });
      shotMid = true;
    }
    if (b.state === 'shattering') {
      await page.screenshot({ path: `${OUT}/countdown-2-shatter.png` });
      break;
    }
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/countdown-3-gone.png` });
});
