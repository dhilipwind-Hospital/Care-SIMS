import { test, expect, Page } from '@playwright/test';

// Drives the Referral station in the REAL UI and screenshots each step, to confirm
// the documented flow matches what is actually on screen. Read-only discovery pass:
// this file does NOT create, accept, complete or delete anything.
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

test('Referral — discovery pass', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');

  await page.goto('/app/referral', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Referrals/i }).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /New Referral/i })).toBeVisible({ timeout: 30000 });
  // Wait for REAL data, not the skeleton — asserting on the button alone races the fetch.
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: 'shots/ref-1-landing.png', fullPage: true });

  const body = await page.locator('body').innerText();
  const has = (s: string) => body.includes(s);
  console.log('LANDING:', 'Total=', has('Total'), '| Pending=', has('Pending'),
    '| Accepted=', has('Accepted'), '| Completed=', has('Completed'),
    '| RefCol=', has('Ref #'), '| ToDept=', has('To Dept'), '| Urgency=', has('Urgency'));
  console.log('SEEDED ROWS:', 'Karthik=', has('Karthik'), '| Sneha=', has('Sneha'),
    '| Rohan=', has('Rohan'), '| Ananya=', has('Ananya'), '| REF-=', has('REF-'));

  // Which action buttons render, and how many of each
  for (const name of ['Edit', 'Accept', 'Decline', 'Complete', 'Print']) {
    console.log(`BTN ${name}:`, await page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).count());
  }

  // Mine tab
  await page.getByRole('button', { name: /My Referrals/i }).click();
  await expect(page.getByText(/No referrals found/i)).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'shots/ref-2-mine.png', fullPage: true });
  const mineText = await page.locator('body').innerText();
  console.log('MINE TAB: empty-state shown =', mineText.includes('No referrals found'));

  await page.getByRole('button', { name: /All Referrals/i }).click();
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 30000 });

  // Open the form and inspect it
  await page.getByRole('button', { name: /New Referral/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/ref-3-form.png', fullPage: true });
  const formText = await page.locator('body').innerText();
  console.log('FORM placeholders present:',
    'patient=', await page.getByPlaceholder(/Search patient/i).count(),
    '| dept=', await page.getByPlaceholder(/Select department/i).count(),
    '| doctor=', await page.getByPlaceholder(/Select doctor/i).count(),
    '| reason=', await page.getByPlaceholder(/Reason/i).count(),
    '| notes=', await page.getByPlaceholder(/Clinical Notes/i).count(),
    '| submitBtn=', await page.getByRole('button', { name: /^Submit$/i }).count());
  console.log('URGENCY select options:', await page.locator('select').first().locator('option').allInnerTexts().catch(() => []));

  // Validation: submit empty -> should complain about the patient, and create nothing
  await page.getByRole('button', { name: /^Submit$/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/ref-4-validation.png', fullPage: true });
  const vText = await page.locator('body').innerText();
  console.log('VALIDATION msg shown:', vText.includes('Please select a patient'), '| text sample:',
    (vText.match(/Please select a [a-z]+/) || ['none'])[0]);
});
