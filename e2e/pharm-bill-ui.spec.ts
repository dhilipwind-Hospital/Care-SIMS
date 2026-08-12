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

test('pharmacy — dispense through the UI button', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  await login(page, 'pharmacy@simsbox.demo');
  await page.goto('/app/pharmacy', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/RX-/).first()).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: 'shots/ph-01-queue.png', fullPage: true });

  const body = await page.locator('body').innerText();
  console.log('queue shows a doctor name:', /Dr\./.test(body));
  console.log('stock badges present     :', /In Stock|Low Stock|Out|Unknown/.test(body));

  // Pick the disposable prescription
  const row = page.locator('tr', { hasText: 'RX-1786511899721' }).first();
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/ph-02-selected.png', fullPage: true });
  const panel = await page.locator('body').innerText();
  console.log('panel total shown        :', (panel.match(/₹[\d,]+(\.\d+)?/g) || []).slice(0, 4));

  const notes = page.getByPlaceholder(/pharmacist note/i).or(page.locator('textarea')).first();
  if (await notes.isVisible().catch(() => false)) await notes.fill('UICHECK dispensed at the counter');

  const btn = page.getByRole('button', { name: /Dispense Medication/i }).first();
  await expect(btn).toBeVisible({ timeout: 20000 });
  await btn.click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'shots/ph-03-dispensed.png', fullPage: true });
  console.log('after dispense, page mentions Dispensed:', /dispensed/i.test(await page.locator('body').innerText()));
});

test('billing — finalize and collect through the UI', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  await login(page, 'billing@simsbox.demo');
  await page.goto('/app/billing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/INV-/).first()).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: 'shots/bl-01-list.png', fullPage: true });
  const kpis = await page.locator('body').innerText();
  console.log('KPI labels:', (kpis.match(/TOTAL DUE|COLLECTED TODAY|PENDING|INVOICES TODAY/gi) || []));

  // Open the newest invoice (the one the dispense just touched)
  await page.getByText(/INV-/).first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/bl-02-detail.png', fullPage: true });

  const fin = page.getByRole('button', { name: /^Finalize$/i }).first();
  if (await fin.isVisible().catch(() => false)) {
    await fin.click(); await page.waitForTimeout(4000);
    console.log('finalized');
    await page.screenshot({ path: 'shots/bl-03-finalized.png', fullPage: true });
  } else { console.log('no Finalize button (already finalized)'); }

  // Overpayment must be refused — this writes nothing
  const amt = page.locator('input[type="number"]').first();
  if (await amt.isVisible().catch(() => false)) {
    await amt.fill('999999');
    await page.getByRole('button', { name: /Collect Payment/i }).first().click();
    await page.waitForTimeout(2500);
    const t = await page.locator('body').innerText();
    console.log('overpayment refused:', /exceeds/i.test(t));
    await page.screenshot({ path: 'shots/bl-04-overpay-refused.png', fullPage: true });
  } else { console.log('no amount field visible'); }
});
