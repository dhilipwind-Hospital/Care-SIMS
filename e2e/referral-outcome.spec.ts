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
async function pick(page: Page, idx: number, ph: RegExp, txt: string, expected: RegExp) {
  await page.getByRole('combobox').nth(idx).click();
  await page.getByPlaceholder(ph).fill(txt);
  const opt = page.getByRole('listbox').getByRole('option').filter({ hasText: expected }).first();
  await expect(opt).toBeVisible({ timeout: 20000 });
  await opt.click();
}

test('Decline now captures a reason; Complete captures an outcome note', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/referral', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 45000 });

  for (const [tag, mode, note] of [
    ['OUTCOMECHK-D', 'Decline', 'Specialist unavailable this week — refer to cardiology instead.'],
    ['OUTCOMECHK-C', 'Complete', 'Seen in clinic; ECG normal, discharged with advice.'],
  ] as const) {
    await page.getByRole('button', { name: /New Referral/i }).click();
    await pick(page, 0, /Search patient/i, 'Ananya', /Ananya Reddy/);
    await pick(page, 1, /Select department/i, 'Gen', /General Medicine/);
    await page.getByPlaceholder(/Reason/i).fill(tag);
    await page.getByRole('button', { name: /^Submit$/i }).click();
    const row = page.locator('tr', { hasText: tag });
    await expect(row).toBeVisible({ timeout: 30000 });

    if (mode === 'Complete') {
      await row.getByRole('button', { name: /^Accept$/i }).click();
      await expect(row.getByRole('button', { name: /^Complete$/i })).toBeVisible({ timeout: 30000 });
    }
    await row.getByRole('button', { name: new RegExp(`^${mode}$`) }).click();

    // The new dialog
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `shots/ui-12-${mode.toLowerCase()}-dialog.png`, fullPage: true });

    if (mode === 'Decline') {
      // Reason is mandatory — confirm the empty case is blocked.
      await dlg.getByRole('button', { name: /^Decline$/ }).click();
      await expect(page.getByText(/Please give a reason for declining/i)).toBeVisible({ timeout: 10000 });
      console.log('Decline with empty reason -> blocked ✔');
    }
    await dlg.locator('textarea').fill(note);
    await dlg.getByRole('button', { name: new RegExp(`^${mode}$`) }).click();
    await expect(row).toContainText(mode === 'Decline' ? /DECLINED/ : /COMPLETED/, { timeout: 30000 });
    console.log(`${mode} saved for ${tag}`);
  }
  await page.screenshot({ path: 'shots/ui-13-outcomes-saved.png', fullPage: true });
});
