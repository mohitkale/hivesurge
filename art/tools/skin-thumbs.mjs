/* global process */
// Writes public/assets/skins/<id>.png picker previews from skin-thumb.html (PR 069).
// Usage: node art/tools/skin-thumbs.mjs <dev-url> <id...>
const puppeteer = (await import(process.env.PUPPETEER_MODULE)).default;
const [base, ...ids] = process.argv.slice(2);
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const id of ids) {
  const p = await b.newPage();
  await p.setViewport({ width: 128, height: 128 });
  await p.goto(`${base}art/tools/skin-thumb.html?id=${id}`, { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', { timeout: 20000 });
  const el = await p.$('#c');
  await el.screenshot({ path: `public/assets/skins/${id}.png`, omitBackground: true });
  console.log(id);
  await p.close();
}
await b.close();
