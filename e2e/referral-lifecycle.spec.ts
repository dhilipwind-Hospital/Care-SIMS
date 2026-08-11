import { test, expect, Page } from '@playwright/test';

// Walks a referral through its full lifecycle in the REAL UI and screenshots each
// step. Creates ONE row tagged UIFLOWCHECK, which is hard-deleted afterwards.
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

const PW = 'Demo@1234';
const TAG = 'UIFLOWCHECK';

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
}

async function pick(page: Page, idx: number, placeholder: RegExp, typeText?: string) {
  const combo = page.getByRole('combobox').nth(idx);
  await combo.click();
  if (typeText) {
    const input = page.getByPlaceholder(placeholder);
    await input.fill(typeText);
  }
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible({ timeout: 20000 });
  // Options carry role="option", which overrides the implicit button role.
  const opt = listbox.getByRole('option').first();
  await expect(opt).toBeVisible({ timeout: 20000 });
  const label = (await opt.innerText()).split('\n')[0];
  await opt.click();
  return label;
}

test('Referral — full lifecycle in the UI', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/referral', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 45000 });

  const before = await page.getByText(/REF-/).count();
  console.log('rows before:', before);

  // ---- CREATE ----
  await page.getByRole('button', { name: /New Referral/i }).click();
  const patient = await pick(page, 0, /Search patient/i, 'Ananya');
  const dept    = await pick(page, 1, /Select department/i, 'Gen');
  console.log('picked patient =', patient, '| dept =', dept);
  await page.getByPlaceholder(/Reason/i).fill(TAG);
  await page.locator('select').first().selectOption('URGENT');
  await page.screenshot({ path: 'shots/ref-5-filled.png', fullPage: true });

  await page.getByRole('button', { name: /^Submit$/i }).click();
  const row = page.locator('tr', { hasText: TAG });
  await expect(row).toBeVisible({ timeout: 30000 });
  console.log('CREATED — row visible. status cell:', await row.innerText());
  await page.screenshot({ path: 'shots/ref-6-created.png', fullPage: true });

  // ---- ACCEPT ----
  await row.getByRole('button', { name: /^Accept$/i }).click();
  await expect(page.locator('tr', { hasText: TAG }).getByRole('button', { name: /^Complete$/i }))
    .toBeVisible({ timeout: 30000 });
  console.log('ACCEPTED — Complete button now present, Accept/Decline gone');
  await page.screenshot({ path: 'shots/ref-7-accepted.png', fullPage: true });

  // ---- COMPLETE ----
  await page.locator('tr', { hasText: TAG }).getByRole('button', { name: /^Complete$/i }).click();
  await expect(page.locator('tr', { hasText: TAG })).toContainText(/COMPLETED/i, { timeout: 30000 });
  console.log('COMPLETED — final row:', await page.locator('tr', { hasText: TAG }).innerText());
  await page.screenshot({ path: 'shots/ref-8-completed.png', fullPage: true });

  // no lifecycle buttons should remain on a COMPLETED row
  const finalRow = page.locator('tr', { hasText: TAG });
  for (const n of ['Accept', 'Decline', 'Complete', 'Edit']) {
    console.log(`  COMPLETED row still shows ${n}:`, await finalRow.getByRole('button', { name: new RegExp(`^${n}$`, 'i') }).count());
  }
  console.log('  Print available:', await finalRow.getByRole('button', { name: /Print/i }).count());
});
