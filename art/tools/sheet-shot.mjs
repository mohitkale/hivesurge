/* global process */
// node art/tools/sheet-shot.mjs <url-of-sheet.html> <out.png>
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE ?? 'puppeteer-core');
const [url, out] = process.argv.slice(2);
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const p = await b.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.setViewport({ width: +(process.env.W || 1200), height: +(process.env.H || 760) });
await p.goto(url, { waitUntil: 'networkidle0' });
await p.waitForFunction(() => document.title === 'ready', { timeout: 20000 });
await p.screenshot({ path: out });
await b.close();
