import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';

test('billing — search, overpayment refused, then collect', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('billing@simsbox.demo');
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });

  await page.goto('/app/billing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/INV-/).first()).toBeVisible({ timeout: 45000 });

  // The search box that never filtered
  await page.getByPlaceholder(/Search invoice or patient/i).fill('INV-2026-000062');
  await expect(page.getByText('INV-2026-000062').first()).toBeVisible({ timeout: 25000 });
  const rows = await page.locator('tr', { hasText: /INV-/ }).count();
  console.log('rows after searching INV-2026-000062:', rows);
  await page.screenshot({ path: 'shots/bl-05-search.png', fullPage: true });

  await page.getByText('INV-2026-000062').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/bl-06-detail.png', fullPage: true });

  const amt = page.locator('input[type="number"]').first();
  await expect(amt).toBeVisible({ timeout: 25000 });

  // 1) overpayment — must be refused, and must write nothing
  await amt.fill('999999');
  await page.getByRole('button', { name: /Collect Payment/i }).first().click();
  await page.waitForTimeout(2500);
  const refused = await page.locator('body').innerText();
  console.log('overpayment refused:', /exceeds/i.test(refused));
  await page.screenshot({ path: 'shots/bl-07-overpay-refused.png', fullPage: true });
  expect(/exceeds/i.test(refused)).toBeTruthy();

  // 2) the real amount
  await amt.fill('26');
  await page.getByRole('button', { name: /Collect Payment/i }).first().click();
  await page.waitForTimeout(5000);
  const after = await page.locator('body').innerText();
  console.log('shows PAID after collecting:', /PAID/.test(after));
  await page.screenshot({ path: 'shots/bl-08-paid.png', fullPage: true });
});
