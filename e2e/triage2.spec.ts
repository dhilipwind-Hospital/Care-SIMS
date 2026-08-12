import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';
const MRN = 'SIMS-8062864';

test('triage the second patient with a NON-default acuity', async ({ page }) => {
  test.setTimeout(7 * 60 * 1000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('nurse@simsbox.demo');
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });

  await page.goto('/app/nurse/triage', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(MRN).first()).toBeVisible({ timeout: 40000 });
  await page.getByText(MRN).first().click();
  await page.waitForTimeout(2500);

  // Urgent = YELLOW, deliberately not the GREEN default
  await page.getByRole('button', { name: /Urgent\s*Requires evaluation/i }).first().click();
  console.log('acuity set to Urgent (YELLOW)');
  const nums = page.locator('input[type="number"]');
  const vals = ['138', '92', '104', '39', '94', '22', '68', '166', '7'];
  for (let i = 0; i < Math.min(await nums.count(), vals.length); i++) await nums.nth(i).fill(vals[i]).catch(() => {});
  await page.getByPlaceholder(/Fever and body ache/i).fill('Chest tightness, breathless on exertion').catch(() => {});
  await page.screenshot({ path: 'shots/jz-10-urgent-filled.png', fullPage: true });

  const save = page.getByRole('button', { name: /Save Vitals/i }).first();
  if (await save.isVisible().catch(() => false)) { await save.click(); await page.waitForTimeout(2500); }
  await page.getByRole('button', { name: /Complete Triage/i }).first().click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'shots/jz-11-urgent-done.png', fullPage: true });
  console.log('completed');
});
