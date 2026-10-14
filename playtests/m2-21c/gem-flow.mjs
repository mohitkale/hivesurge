/**
 * M2-21c headless check (dev server, dev-only ?level / ?revive=force from PR 047):
 * two early ad closes, then "Ad limit reached" with gems valid (offer stays open, gem revive
 * works) or not valid (offer closes). Usage: node playtests/m2-21c/gem-flow.mjs <url>
 */
import puppeteer from 'puppeteer-core';

const base = process.argv[2];
const PRICE = 5; // revive.gemPrice default (decision 36)
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
let fail = false;
const check = (name, ok) => {
  out.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) fail = true;
};

async function scenario(gems) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate((g) => {
    localStorage.setItem(
      'hivesurge.save.v1',
      JSON.stringify({
        version: 1,
        ftueDone: true,
        battlesCompleted: 10,
        gems: g,
        bestStars: { 'ftue-meadow': 3 },
      }),
    );
  }, gems);
  await page.goto(`${base}?level=dandelion-drift&revive=force`, { waitUntil: 'load' });
  const q = (sel) =>
    page.evaluate((s) => {
      const b = document.querySelector(s);
      return b
        ? {
            text: b.textContent.trim(),
            disabled: b.disabled,
            visible: getComputedStyle(b.closest('.revive-row') ?? b).visibility !== 'hidden',
          }
        : null;
    }, sel);
  await page.waitForSelector('[data-a="play"]');
  await page.click('[data-a="play"]');
  await page.waitForSelector('[data-a="revive"]', { timeout: 120000 }); // idle until the hive breaks
  const tag = `gems=${gems}:`;
  const g0 = await q('[data-a="reviveGems"]');
  check(
    `${tag} offer has gem button (${g0 ? (g0.disabled ? 'disabled' : 'enabled') : 'none'})`,
    !!g0 && g0.disabled === gems < PRICE,
  );
  for (let i = 1; i <= 2; i++) {
    await page.click('[data-a="revive"]');
    await page.waitForSelector('.ad-modal [data-a="close"], [data-a="close"]');
    await page.click('[data-a="close"]');
    await sleep(400);
    if (i === 1) {
      const r = await q('[data-a="revive"]');
      check(`${tag} after close 1: ad button still enabled`, !!r && !r.disabled);
    }
  }
  const limit = await q('[data-a="adLimit"]');
  const gem = await q('[data-a="reviveGems"]');
  const no = await q('[data-a="noThanks"]');
  if (gems >= PRICE) {
    check(
      `${tag} after close 2: "Ad limit reached" disabled`,
      !!limit && limit.disabled && limit.text === 'Ad limit reached',
    );
    check(
      `${tag} after close 2: offer open, gem button enabled, No thanks shown`,
      !!gem && !gem.disabled && !!no && no.visible,
    );
    await page.click('[data-a="reviveGems"]');
    await page.waitForSelector('[data-a="gemSpend"]');
    await page.click('[data-a="gemSpend"]');
    await sleep(500);
    const inBattle = await page.evaluate(() => !document.querySelector('#overlay .modal'));
    const left = await page.evaluate(
      () => JSON.parse(localStorage.getItem('hivesurge.save.v1')).gems,
    );
    check(`${tag} gem revive: battle resumed, balance ${left}`, inBattle && left === gems - PRICE);
  } else {
    const open = !!no && no.visible && !no.disabled;
    check(
      `${tag} after close 2 with gems not valid: offer closed (defeat screen, Retry/Home)`,
      !open && !!(await q('[data-a="retry"]')),
    );
  }
  await page.close();
}

await scenario(7);
await scenario(4);
await browser.close();
console.log(out.join('\n'));
process.exit(fail ? 1 : 0);
