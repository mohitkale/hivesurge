/**
 * M2-21 QA follow-ups: single-click check for PLAY / Retry and console warnings.
 * Dev server only (uses the dev-only ?level and ?revive=force params).
 * Usage: node playtests/m2-21-qa/clicks.mjs <url> [rounds=3]
 */
import puppeteer from 'puppeteer-core';

const [base, roundsArg] = process.argv.slice(2);
const ROUNDS = Number(roundsArg ?? 3);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
await page.goto(base, { waitUntil: 'load' });
await page.evaluate(() =>
  localStorage.setItem(
    'hivesurge.save.v1',
    JSON.stringify({ ftueDone: true, battlesCompleted: 10, bestStars: { 'ftue-meadow': 3 } }),
  ),
);
await page.goto(`${base}?level=dandelion-drift&revive=force`, { waitUntil: 'load' });
const hasBtn = (a) => page.evaluate((a) => !!document.querySelector(`[data-a="${a}"]`), a);
const inBattle = () => page.evaluate(() => !document.querySelector('#overlay .modal'));
const results = [];
async function clickOnce(a) {
  await page.waitForFunction(
    (a) => document.querySelector(`[data-a="${a}"]`),
    { timeout: 120000 },
    a,
  );
  await new Promise((r) => setTimeout(r, 300));
  await page.click(`[data-a="${a}"]`);
  await new Promise((r) => setTimeout(r, 600));
  const ok = await inBattle();
  results.push(`${a}: ${ok ? 'started on 1 click' : 'NOT started after 1 click'}`);
  if (!ok && (await hasBtn(a))) {
    await page.click(`[data-a="${a}"]`);
    await new Promise((r) => setTimeout(r, 600));
    results.push(`${a}: second click -> ${(await inBattle()) ? 'started' : 'still not started'}`);
  }
}
await clickOnce('play');
for (let i = 0; i < ROUNDS; i++) {
  // Idle until the hive breaks; the forced revive offer appears; decline, then Retry.
  await page.waitForFunction(() => document.querySelector('[data-a="noThanks"]'), {
    timeout: 120000,
  });
  results.push('loss: revive offer shown (forced)');
  if (process.env.SKIP_NO_THANKS !== '1') await page.click('[data-a="noThanks"]');
  await clickOnce('retry');
}
// Press Retry just before the 10 s revive countdown runs out and release just after: the
// click is lost if the defeat screen is rebuilt under the pointer (QA "needs two clicks").
{
  await page.waitForFunction(() => document.querySelector('[data-a="noThanks"]'), {
    timeout: 120000,
  });
  await page.waitForFunction(() => document.querySelector('.revive-count')?.textContent === '1', {
    timeout: 20000,
  });
  const box = await (await page.$('[data-a="retry"]')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForFunction(
    () => {
      const b = document.querySelector('[data-a="noThanks"]');
      return !b || b.disabled;
    },
    {
      timeout: 5000,
    },
  );
  await new Promise((r) => setTimeout(r, 100));
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 600));
  results.push(
    `retry pressed across countdown expiry: ${(await inBattle()) ? 'started on 1 click' : 'NOT started after 1 click (reproduced)'}`,
  );
}
await browser.close();
const warn = logs.filter((l) => /AudioContext|warn|error/i.test(l));
console.log(results.join('\n'));
console.log(`console warnings/errors: ${warn.length}`);
for (const w of warn) console.log('  ' + w);
