import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
test.use({ baseURL: 'https://care-sims.vercel.app' });

test('changed pages still render on production', async ({ page }) => {
  test.setTimeout(180000);
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 80)));
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(cfg.logins.admin);
  await page.locator('input[type="password"]').fill(cfg.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });

  const pages = ['referral', 'birth-death', 'pharmacy/purchase-orders', 'antimicrobial', 'clinical-pathways'];
  const out: any[] = [];
  for (const r of pages) {
    await page.goto(`/app/${r}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1800);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    const crashed = /Something went wrong|An unexpected error occurred/i.test(body);
    const url = page.url();
    const ok = !crashed && url.includes(r.split('/')[0]) && body.trim().length > 40;
    await page.screenshot({ path: `shots/render-${r.replace(/\//g, '-')}.png`, fullPage: true });
    out.push({ r, ok, crashed });
    console.log(`${ok ? '✓' : '✗'} ${r.padEnd(26)} ${ok ? 'renders' : (crashed ? 'CRASHED' : 'issue')}`);
  }
  console.log(`\n=== ${out.filter(o => o.ok).length}/${out.length} changed pages render OK ===`);
  expect(out.every(o => o.ok)).toBeTruthy();
});
