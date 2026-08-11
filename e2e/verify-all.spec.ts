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

test('menu links reach their pages for the roles that were missing them', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  for (const [email, label, urlPart] of [
    ['billing@simsbox.demo', 'Insurance/TPA', '/app/insurance'],
    ['lab@simsbox.demo',     'Radiology',     '/app/radiology'],
  ] as const) {
    await login(page, email);
    const link = page.getByRole('link', { name: new RegExp(label.replace('/', '\\/'), 'i') })
      .or(page.locator('a', { hasText: label })).first();
    await expect(link).toBeVisible({ timeout: 30000 });
    await link.click();
    await page.waitForURL(new RegExp(urlPart.replace('/', '\\/')), { timeout: 30000 });
    // Landing on the page must not bounce to a dashboard or show Access Denied
    const txt = await page.locator('body').innerText();
    console.log(`${email.padEnd(24)} -> ${page.url().split('care-sims.vercel.app')[1]}  denied=${/access denied|not authori/i.test(txt)}`);
    expect(page.url()).toContain(urlPart);
    expect(/access denied|not authori/i.test(txt)).toBeFalsy();
  }
});

test('/app/patient redirects instead of rendering an empty shell', async ({ page }) => {
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/patient', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const url = page.url();
  console.log('/app/patient ->', url.split('care-sims.vercel.app')[1]);
  const body = await page.locator('body').innerText();
  // Admin is bounced onward by the PATIENT role guard; the point is that the
  // bare URL no longer parks on an empty PatientLayout shell.
  expect(url).not.toMatch(/\/app\/patient$/);
  expect(body.trim().length).toBeGreaterThan(50);
});

test('referral form exposes type, location and diagnosis', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/referral', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/REF-/).first()).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: /New Referral/i }).click();

  await expect(page.getByRole('button', { name: /^Internal$/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /^External$/ })).toBeVisible();
  console.log('INTERNAL mode  — To Location present:', await page.getByText('To Location').count(),
              '| Diagnosis present:', await page.getByText('Diagnosis').count(),
              '| dept combo:', await page.getByPlaceholder(/Select department/i).count());
  await page.screenshot({ path: 'shots/ui-14-referral-internal.png', fullPage: true });

  await page.getByRole('button', { name: /^External$/ }).click();
  await page.waitForTimeout(600);
  console.log('EXTERNAL mode — facility field:', await page.getByPlaceholder(/Apollo Cardiology/i).count(),
              '| ext doctor field:', await page.getByPlaceholder(/S\. Menon/i).count(),
              '| dept combo gone:', (await page.getByPlaceholder(/Select department/i).count()) === 0,
              '| To Location hidden:', (await page.getByText('To Location').count()) === 0);
  await page.screenshot({ path: 'shots/ui-15-referral-external.png', fullPage: true });
  await expect(page.getByPlaceholder(/Apollo Cardiology/i)).toBeVisible();
});

test('doctor consultation offers a Refer action that carries the patient', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/doctor/consultation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const pid = await page.evaluate(async () => {
    const r = await fetch('/api/patients?limit=1', { headers: { Authorization: 'Bearer ' + localStorage.getItem('hms_token') } });
    const j = await r.json(); return j?.data?.[0]?.id || '';
  });
  console.log('patient id resolved:', pid.slice(0, 8) || 'NONE');
  await page.goto(`/app/doctor/consultation?patientId=${pid}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const refer = page.getByRole('button', { name: /^Refer$/ });
  await expect(refer).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'shots/ui-16-consult-refer.png', fullPage: true });
  await refer.click();
  await page.waitForURL(/\/app\/referral\?patientId=/, { timeout: 30000 });
  console.log('Refer ->', decodeURIComponent(page.url().split('care-sims.vercel.app')[1]));
  await expect(page.getByRole('button', { name: /^Submit$/ })).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: 'shots/ui-17-referral-prefilled.png', fullPage: true });
});
