import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const ORDER = 'LAB-1786513735588-00012';

test('enter results (waiting properly) then validate', async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);
  const failures: string[] = [];
  page.on('response', r => { if (r.url().includes('/api/lab') && r.status() >= 400) failures.push(`${r.status()} ${r.url().split('/api')[1]}`); });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('lab@simsbox.demo');
  await page.locator('input[type="password"]').fill('Demo@1234');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(ORDER).first()).toBeVisible({ timeout: 45000 });

  await page.locator('tr', { hasText: ORDER }).getByRole('button', { name: /Enter Results/i }).first().click();
  const modal = page.locator('text=Enter Results —').locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  await expect(page.getByRole('button', { name: /^Submit Results$/ })).toBeVisible({ timeout: 20000 });

  // Fill only the RESULT column properly, leave the rest sensible
  const inputs = page.locator('input[type="text"]');
  const n = await inputs.count();
  console.log('text inputs in modal region:', n);
  await inputs.nth(0).fill('13.5');
  if (n > 1) await inputs.nth(1).fill('g/dL');
  if (n > 2) await inputs.nth(2).fill('13.0-17.0');
  if (n > 3) await inputs.nth(3).fill('Within range');

  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/lab') && r.request().method() === 'POST', { timeout: 60000 }).catch(() => null),
    page.getByRole('button', { name: /^Submit Results$/ }).click(),
  ]);
  console.log('POST response:', resp ? `${resp.status()} ${resp.url().split('/api')[1]}` : 'none captured');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'shots/lb-09-after-submit.png', fullPage: true });
  console.log('row:', (await page.locator('tr', { hasText: ORDER }).innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,130));
  if (failures.length) console.log('FAILED lab calls:', failures.join(' | '));
});
