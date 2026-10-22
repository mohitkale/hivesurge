import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(
  readFileSync('/workspace/hivesurge/.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL_ = env.VITE_SUPABASE_URL,
  ANON = env.VITE_SUPABASE_ANON_KEY;
const pass = readFileSync('/workspace/scratch/qa/.qa-pass', 'utf8').trim();
const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'qa-m7-headless@example.invalid', password: pass }),
});
const session = await r.json();
console.log(
  '[real] password sign-in status',
  r.status,
  session.user
    ? 'user ok'
    : JSON.stringify(session)
        .slice(0, 120)
        .replace(/eyJ[\w.-]+/g, '<jwt>'),
);
if (!session.user) process.exit(1);
session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
const key = `sb-${new URL(URL_).hostname.split('.')[0]}-auth-token`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(
  ([k, v]) => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, v);
  },
  [key, JSON.stringify(session)],
);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const reqs = [];
page.on('response', (res) => {
  const u = new URL(res.url());
  if (u.hostname.endsWith('supabase.co'))
    reqs.push(res.request().method() + ' ' + u.pathname + ' ' + res.status());
});
const click = (s) => page.locator(s).first().click({ force: true });
const log = (...a) => console.log('[real]', ...a);
await page.goto('http://127.0.0.1:5173/?battle=8');
await page.waitForSelector('.home');
await page.waitForTimeout(6000);
log('rank label:', await page.locator('.home-sec h3').filter({ hasText: 'Rankings' }).innerText());
log('ranks:', (await page.locator('.rank-list').innerText()).replace(/\s+/g, ' '));
await click('[data-a=settings]');
await page.waitForTimeout(300);
await click('[data-a=account]');
await page.waitForTimeout(2500);
log('account:', (await page.locator('#overlay').innerText()).replace(/\s+/g, ' ').slice(0, 300));
if (await page.locator('[data-a="acct:sync"]').count()) {
  await click('[data-a="acct:sync"]');
  await page.waitForTimeout(3000);
  log(
    'after sync:',
    (await page.locator('#overlay').innerText())
      .replace(/\s+/g, ' ')
      .match(/Cloud save:[^.]*|Synced\.?|offline[^.]*/gi),
  );
}
log('supabase calls:', JSON.stringify([...new Set(reqs)]));
log('errors:', errs.join('\n') || 'none');
await ctx.storageState({ path: '/workspace/scratch/qa/.state.json' });
await browser.close();
