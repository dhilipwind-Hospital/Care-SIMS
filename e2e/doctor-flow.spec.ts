import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
}

test('doctor writes a prescription — drug picked from the catalog', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/doctor/prescriptions', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /New Prescription/i }).click();
  await page.screenshot({ path: 'shots/dr-01-rx-form.png', fullPage: true });

  // Patient
  await page.getByPlaceholder(/Search patient by name or ID/i).fill('Ananya');
  const pOpt = page.locator('button', { hasText: /Ananya Reddy/ }).first();
  await expect(pOpt).toBeVisible({ timeout: 20000 });
  await pOpt.click();

  // Drug — picked from the CATALOG, which is what sets drugId
  await page.getByPlaceholder(/Search drug catalog/i).fill('Calpol');
  const dOpt = page.locator('button', { hasText: /Calpol/ }).first();
  await expect(dOpt).toBeVisible({ timeout: 20000 });
  const drugLabel = await dOpt.innerText();
  await dOpt.click();
  console.log('drug picked:', drugLabel.split('\n')[0]);

  await page.getByPlaceholder('1 tab').first().fill('1 tab');
  await page.screenshot({ path: 'shots/dr-02-rx-filled.png', fullPage: true });

  await page.getByRole('button', { name: /Save Prescription/i }).click();
  await expect(page.getByRole('button', { name: /New Prescription/i })).toBeVisible({ timeout: 40000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/dr-03-rx-saved.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('list shows RX-:', /RX-/.test(body));
});

test('doctor orders a lab test', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/doctor/lab-orders', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/dr-04-lab-landing.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('LAB PAGE headings/buttons:');
  for (const b of await page.getByRole('button').allInnerTexts()) {
    const t = b.trim().replace(/\n/g, ' ');
    if (t) console.log('   btn:', t.slice(0, 40));
  }
  console.log('has "New"/"Order":', /new order|order test|new lab|\+ ?new/i.test(body));
});
