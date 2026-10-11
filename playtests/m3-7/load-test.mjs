/**
 * M3-7 progressive-loading check. Fresh profile (no cache), Chrome "Fast 4G" throttling,
 * 390x844 viewport. Measures time from navigation start to the first battle
 * (performance mark `hs:first-battle`, set right after the first gameplayStart) and lists
 * every request with its start time, flagging M3 assets (GLB models, Opus audio, icons, FTUE art).
 *
 * Usage: node playtests/m3-7/load-test.mjs <url> <out-prefix> [runs=3]
 * Writes <out-prefix>-timing.txt and <out-prefix>-network.txt; exits 1 if a check fails.
 */
import { writeFileSync } from 'node:fs';
import puppeteer, { PredefinedNetworkConditions } from 'puppeteer-core';

const [url, prefix, runsArg] = process.argv.slice(2);
const RUNS = Number(runsArg ?? 3);
const LIMIT_MS = 3000;
const MARK = 'hs:first-battle';
/**
 * M3 assets that must load after the first battle: 5 runtime GLBs + 9 Opus cues (PR 038).
 * Fewer means deferred loading silently broke (a task never ran, or the files 404).
 */
const MIN_LATE_ASSETS = 14;
const M3_ASSET = /\/assets\/(models|audio|icons|ftue)\//;

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const timing = [];
const network = [];
let failed = false;
for (let run = 1; run <= RUNS; run++) {
  const ctx = await browser.createBrowserContext(); // fresh profile: empty cache + storage
  const page = await ctx.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateNetworkConditions(PredefinedNetworkConditions['Fast 4G']);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Real asset responses: 2xx and not an HTML page (an SPA fallback answers a missing file with
  // index.html and 200, which the resource timing alone cannot tell apart).
  const okAssets = new Set();
  page.on('response', (res) => {
    const type = res.headers()['content-type'] ?? '';
    if (M3_ASSET.test(res.url()) && res.ok() && !type.includes('text/html'))
      okAssets.add(res.url());
  });
  await page.goto(url, { waitUntil: 'load' });
  // Fresh profile: the FTUE battle starts on its own (no click needed).
  await page.waitForFunction(
    (m) => performance.getEntriesByName(m).length > 0,
    { timeout: 30000 },
    MARK,
  );
  // Let the deferred M3 assets load under throttling.
  await new Promise((r) => setTimeout(r, 8000));
  const r = await page.evaluate((m) => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      firstBattle: performance.getEntriesByName(m)[0].startTime,
      domContentLoaded: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
      resources: performance.getEntriesByType('resource').map((e) => ({
        name: e.name,
        start: e.startTime,
        end: e.responseEnd,
        bytes: e.transferSize,
      })),
    };
  }, MARK);
  const early = r.resources.filter((x) => M3_ASSET.test(x.name) && x.start < r.firstBattle);
  const late = r.resources.filter((x) => M3_ASSET.test(x.name) && x.start >= r.firstBattle);
  const coreBytes = r.resources
    .filter((x) => x.start < r.firstBattle)
    .reduce((a, x) => a + x.bytes, 0);
  const lateLoaded = late.filter((x) => okAssets.has(x.name));
  const ok =
    r.firstBattle <= LIMIT_MS &&
    early.length === 0 &&
    lateLoaded.length >= MIN_LATE_ASSETS &&
    errors.length === 0;
  if (!ok) failed = true;
  timing.push(
    `run ${run}: first battle ${r.firstBattle.toFixed(0)} ms (limit ${LIMIT_MS}) · DOMContentLoaded ${r.domContentLoaded.toFixed(0)} ms · load ${r.load.toFixed(0)} ms · ` +
      `bytes before battle ${(coreBytes / 1024).toFixed(1)} KiB · M3 assets before battle ${early.length} · after ${late.length} (loaded ${lateLoaded.length}, min ${MIN_LATE_ASSETS}) · page errors ${errors.length} · ${ok ? 'PASS' : 'FAIL'}`,
  );
  network.push(`## run ${run} (first battle at ${r.firstBattle.toFixed(0)} ms)`);
  network.push('start_ms  end_ms  KiB     phase          M3?  url');
  const rows = [
    ...r.resources,
    { name: `--- ${MARK} ---`, start: r.firstBattle, end: r.firstBattle, bytes: 0 },
  ].sort((a, b) => a.start - b.start);
  for (const x of rows) {
    const path = x.name.replace(/^https?:\/\/[^/]+/, '');
    const phase = x.start < r.firstBattle ? 'before-battle' : 'after-battle';
    network.push(
      `${x.start.toFixed(0).padStart(8)} ${x.end.toFixed(0).padStart(7)} ${(x.bytes / 1024).toFixed(1).padStart(6)}  ${phase.padEnd(14)} ${M3_ASSET.test(x.name) ? 'M3 ' : '   '}  ${path}`,
    );
  }
  network.push('');
  await ctx.close();
}
await browser.close();
const header = `M3-7 load test · ${new Date().toISOString()} · ${url} · Chrome headless, Fast 4G (PredefinedNetworkConditions), cache disabled, fresh context per run, 390x844\n`;
writeFileSync(`${prefix}-timing.txt`, header + timing.join('\n') + '\n');
writeFileSync(`${prefix}-network.txt`, header + '\n' + network.join('\n'));
console.log(header + timing.join('\n'));
process.exit(failed ? 1 : 0);
