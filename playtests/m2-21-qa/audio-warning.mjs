/**
 * Fresh profile (FTUE auto-starts, no gesture yet): prints console warnings, then clicks once
 * and reports the AudioContext state. Usage: node playtests/m2-21-qa/audio-warning.mjs <url>
 */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const logs = [];
page.on('console', (m) =>
  logs.push(
    `${m.type()}: ${m.text()} @ ${m.location()?.url ?? ''}:${m.location()?.lineNumber ?? ''}`,
  ),
);
await page.goto(process.argv[2], { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 3000));
const before = logs.filter((l) => /AudioContext/.test(l)).length;
await page.mouse.click(195, 600);
await new Promise((r) => setTimeout(r, 1000));
console.log(
  `AudioContext warnings before gesture: ${before}; after: ${logs.filter((l) => /AudioContext/.test(l)).length}`,
);
for (const l of logs.filter((l) => /AudioContext/.test(l))) console.log('  ' + l);
await browser.close();
