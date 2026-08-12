import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const ORDER = 'LAB-1786513735588-00012';

test('station 7 final — validate the result', async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('lab@simsbox.demo');
  await page.locator('input[type="password"]').fill('Demo@1234');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(ORDER).first()).toBeVisible({ timeout: 45000 });

  const row = page.locator('tr', { hasText: ORDER });
  console.log('before:', (await row.innerText()).replace(/\s+/g,' ').slice(0,120));
  await page.screenshot({ path: 'shots/lb-11-resulted.png', fullPage: true });

  const val = row.getByRole('button', { name: /Validate/i }).first();
  await expect(val).toBeVisible({ timeout: 20000 });
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/validate') && r.request().method() === 'POST', { timeout: 60000 }).catch(() => null),
    val.click(),
  ]);
  console.log('validate response:', resp ? resp.status() : 'none');
  await page.waitForTimeout(6000);
  console.log('after :', (await page.locator('tr', { hasText: ORDER }).innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,120));
  await page.screenshot({ path: 'shots/lb-12-validated.png', fullPage: true });

  // Print Report should be available on a validated order
  const print = page.locator('tr', { hasText: ORDER }).getByRole('button', { name: /Print Report/i }).first();
  console.log('Print Report available:', await print.isVisible().catch(()=>false));
});
