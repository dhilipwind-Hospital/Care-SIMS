import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

test('capture the exact enter-results request and error', async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);
  page.on('request', async r => {
    if (r.url().includes('/results') && r.method() === 'POST') {
      console.log('REQUEST BODY:', (r.postData() || '').slice(0, 700));
    }
  });
  page.on('response', async r => {
    if (r.url().includes('/results') && r.request().method() === 'POST') {
      console.log('RESPONSE', r.status(), (await r.text().catch(() => '')).slice(0, 400));
    }
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('lab@simsbox.demo');
  await page.locator('input[type="password"]').fill('Demo@1234');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/LAB-/).first()).toBeVisible({ timeout: 45000 });

  const btn = page.getByRole('button', { name: /Enter Results/i }).first();
  await expect(btn).toBeVisible({ timeout: 25000 });
  await btn.click();
  await expect(page.getByRole('button', { name: /^Submit Results$/ })).toBeVisible({ timeout: 20000 });
  const inputs = page.locator('input[type="text"]');
  await inputs.nth(0).fill('13.5');
  await page.getByRole('button', { name: /^Submit Results$/ }).click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: 'shots/lb-10-capture.png', fullPage: true });
  const t = await page.locator('body').innerText();
  const toast = (t.match(/(failed|error|invalid)[^\n]{0,80}/i) || ['no error text on screen'])[0];
  console.log('on-screen error:', toast);
});
