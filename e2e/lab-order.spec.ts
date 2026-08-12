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
  await page.waitForTimeout(2000);
}

test('doctor orders a lab test from the consultation', async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  await login(page, 'doctor@simsbox.demo');
  await page.goto('/app/doctor/consultation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Attach the patient
  await page.getByPlaceholder(/Search patient by name or ID/i).first().fill('Runbook');
  const opt = page.getByText(/Runbook Walkthrough/).first();
  await expect(opt).toBeVisible({ timeout: 25000 });
  await opt.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/dc-04-patient-attached.png', fullPage: true });

  await page.getByRole('button', { name: /^Lab Order$/i }).first().click();
  await page.waitForTimeout(2000);
  const testField = page.getByPlaceholder(/e\.g\. CBC, LFT, RFT/i).first();
  await expect(testField).toBeVisible({ timeout: 20000 });
  await testField.fill('Complete Blood Count');
  await page.getByPlaceholder(/Clinical notes for lab/i).fill('Rule out infection — RUNBOOKLAB').catch(() => {});
  await page.screenshot({ path: 'shots/dc-05-lab-filled.png', fullPage: true });

  const submit = page.getByRole('button', { name: /^Place Lab Order$/i }).first();
  await expect(submit).toBeVisible({ timeout: 20000 });
  await submit.click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'shots/dc-06-lab-ordered.png', fullPage: true });
  const after = await page.locator('body').innerText();
  console.log('panel now lists the order:', !/No lab orders for this patient yet/.test(after));
  console.log('order number on screen:', (after.match(/LAB-[0-9-]+/) || ['none'])[0]);
});
