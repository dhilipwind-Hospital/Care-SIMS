import { test, expect, Page } from '@playwright/test';

// Full visual walkthrough of the Referral station in the REAL UI.
// Creates two rows tagged UIFLOWCHECK-*, which are removed afterwards.
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

const PW = 'Demo@1234';
const S = 'shots/ui';

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
}

/** Type-ahead is debounced — wait for the EXPECTED option, never just the first one. */
async function pick(page: Page, idx: number, placeholder: RegExp, typeText: string, expected: RegExp) {
  await page.getByRole('combobox').nth(idx).click();
  await page.getByPlaceholder(placeholder).fill(typeText);
  const opt = page.getByRole('listbox').getByRole('option').filter({ hasText: expected }).first();
  await expect(opt).toBeVisible({ timeout: 20000 });
  await opt.click();
}

async function createReferral(page: Page, tag: string, urgency: string) {
  await page.getByRole('button', { name: /New Referral/i }).click();
  await pick(page, 0, /Search patient/i, 'Ananya', /Ananya Reddy/);
  await pick(page, 1, /Select department/i, 'Gen', /General Medicine/);
  await page.getByPlaceholder(/Reason/i).fill(tag);
  await page.locator('select').first().selectOption(urgency);
  await page.getByRole('button', { name: /^Submit$/i }).click();
  await expect(page.locator('tr', { hasText: tag })).toBeVisible({ timeout: 30000 });
}

test('Referral — full UI walkthrough', async ({ page, context }) => {
  test.setTimeout(6 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/referral', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: `${S}-01-landing.png`, fullPage: true });

  // My Referrals -> empty for a tenantUser login
  await page.getByRole('button', { name: /My Referrals/i }).click();
  await expect(page.getByText(/No referrals found/i)).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${S}-02-my-referrals.png`, fullPage: true });
  await page.getByRole('button', { name: /All Referrals/i }).click();
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 30000 });

  // Empty form + validation
  await page.getByRole('button', { name: /New Referral/i }).click();
  await page.screenshot({ path: `${S}-03-form-empty.png`, fullPage: true });
  await page.getByRole('button', { name: /^Submit$/i }).click();
  await expect(page.getByText(/Please select a patient/i)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${S}-04-validation.png`, fullPage: true });

  // Filled form
  await pick(page, 0, /Search patient/i, 'Ananya', /Ananya Reddy/);
  await pick(page, 1, /Select department/i, 'Gen', /General Medicine/);
  await page.getByPlaceholder(/Reason/i).fill('UIFLOWCHECK-A');
  await page.getByPlaceholder(/Clinical Notes/i).fill('Walkthrough capture — safe to delete.');
  await page.locator('select').first().selectOption('URGENT');
  await page.screenshot({ path: `${S}-05-form-filled.png`, fullPage: true });
  await page.getByRole('button', { name: /^Submit$/i }).click();
  const rowA = page.locator('tr', { hasText: 'UIFLOWCHECK-A' });
  await expect(rowA).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${S}-06-created-pending.png`, fullPage: true });

  // Edit (pre-filled)
  await rowA.getByRole('button', { name: /^Edit$/i }).click();
  await expect(page.getByRole('button', { name: /^Update$/i })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${S}-07-edit-prefilled.png`, fullPage: true });
  await page.getByRole('button', { name: /^Cancel$/i }).click();

  // Accept -> Complete
  await rowA.getByRole('button', { name: /^Accept$/i }).click();
  await expect(rowA.getByRole('button', { name: /^Complete$/i })).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${S}-08-accepted.png`, fullPage: true });
  await rowA.getByRole('button', { name: /^Complete$/i }).click();
  await expect(rowA).toContainText(/COMPLETED/i, { timeout: 30000 });
  await page.screenshot({ path: `${S}-09-completed.png`, fullPage: true });

  // Second referral -> Decline
  await createReferral(page, 'UIFLOWCHECK-B', 'ROUTINE');
  const rowB = page.locator('tr', { hasText: 'UIFLOWCHECK-B' });
  await rowB.getByRole('button', { name: /^Decline$/i }).click();
  await expect(rowB).toContainText(/DECLINED/i, { timeout: 30000 });
  await page.screenshot({ path: `${S}-10-declined.png`, fullPage: true });
  console.log('DECLINED row:', await rowB.innerText());

  // Print letter (popup)
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('tr', { hasText: 'UIFLOWCHECK-A' }).getByRole('button', { name: /Print/i }).click(),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  await popup.screenshot({ path: `${S}-11-print-letter.png`, fullPage: true });
  console.log('PRINT letter captured');
  await popup.close();
});
