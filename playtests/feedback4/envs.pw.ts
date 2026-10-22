import { test } from '@playwright/test';

// Feedback round 4 #5 proof: one battle per environment (world 1-5 + boss fortress), shot
// ~1.4 s in with the world name card up and the ambient particles running.
// BASE=http://127.0.0.1:5193 npx playwright test -c playtests/feedback4/pw.config.ts envs
const OUT = 'playtests/feedback4/after';
const RUNS: [string, number][] = [
  ['meadow', 2],
  ['orchard', 7],
  ['rainforest', 12],
  ['canyon', 17],
  ['night', 22],
  ['fortress', 10],
];

for (const [env, n] of RUNS)
  test(`environment ${env} (L${n})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?battle=2`);
    await page.locator('.home').waitFor({ timeout: 30_000 });
    await page.evaluate(async (n) => {
      const g = (window as unknown as { __hsGame: Record<string, unknown> }).__hsGame as {
        startBattle: () => void;
        save: { bestStars: Record<string, number> };
        input: { aimX: number; firing: boolean; update: () => void };
      };
      // Generated levels are not in ?battle's authored list: mark L1..n-1 cleared in-page.
      const c = await import(/* @vite-ignore */ `${location.origin}/src/levels/campaign.ts`);
      for (let i = 0; i < n - 1; i++) g.save.bestStars[c.campaignLevel(i).id] = 1;
      g.startBattle();
      g.input.update = () => {};
      g.input.aimX = 0;
      g.input.firing = true;
    }, n);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/env-${env}.png` });
    // Banner gone: the scene itself (and on a wide screen the side props).
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/env-${env}-play.png` });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/env-${env}-wide.png` });
  });
