import { test, Page } from '@playwright/test';
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

async function dump(page: Page, name: string) {
  await page.waitForTimeout(3500);
  const fields = await page.locator('input, select, textarea').evaluateAll(els =>
    els.map((e: any) => ({ t: e.tagName.toLowerCase(), p: e.placeholder || e.getAttribute('aria-label') || e.name || '', ty: e.type || '' }))
       .filter(f => f.p || f.ty === 'number'));
  const btns = (await page.getByRole('button').allInnerTexts()).map(b => b.trim().replace(/\s+/g, ' ')).filter(Boolean);
  console.log(`\n===== ${name} =====`);
  console.log('  fields :', fields.slice(0, 18).map(f => `${f.t}[${f.ty}]"${f.p}"`).join(' | ') || '(none)');
  console.log('  buttons:', [...new Set(btns)].slice(0, 16).join(' · '));
  await page.screenshot({ path: `shots/dz-${name}.png`, fullPage: true });
}

test('discover the screens still unclicked', async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);

  await login(page, 'reception@simsbox.demo');
  await page.goto('/app/patients/register', { waitUntil: 'domcontentloaded' });
  await dump(page, 'reception-register');
  await page.goto('/app/patients', { waitUntil: 'domcontentloaded' });
  await dump(page, 'reception-list');

  await login(page, 'nurse@simsbox.demo');
  await page.goto('/app/nurse/triage', { waitUntil: 'domcontentloaded' });
  await dump(page, 'nurse-triage');

  await login(page, 'lab@simsbox.demo');
  await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
  await dump(page, 'lab-worklist');

  await login(page, 'admin@simsbox.demo');
  await page.goto('/app/admin/departments', { waitUntil: 'domcontentloaded' });
  await dump(page, 'admin-departments');
  await page.goto('/app/admin/locations', { waitUntil: 'domcontentloaded' });
  await dump(page, 'admin-locations');
  await page.goto('/app/admin/users', { waitUntil: 'domcontentloaded' });
  await dump(page, 'admin-users');
});
