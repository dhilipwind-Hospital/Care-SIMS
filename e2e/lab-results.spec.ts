import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const ORDER = 'LAB-1786513735588-00012';

test('enter results then validate', async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('lab@simsbox.demo');
  await page.locator('input[type="password"]').fill('Demo@1234');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(ORDER).first()).toBeVisible({ timeout: 45000 });

  await page.locator('tr', { hasText: ORDER }).getByRole('button', { name: /Enter Results/i }).first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/lb-05-results-modal.png', fullPage: true });

  const fields = await page.locator('input, textarea, select').evaluateAll(els =>
    els.map((e: any) => `${e.tagName.toLowerCase()}[${e.type||''}]"${e.placeholder||e.getAttribute('aria-label')||e.name||''}"`));
  console.log('modal fields:', fields.slice(0, 14).join(' | '));
  const btns = [...new Set((await page.getByRole('button').allInnerTexts()).map(b=>b.trim()).filter(Boolean))];
  console.log('modal buttons:', btns.slice(0, 14).join(' · '));

  // Fill every visible text/number input inside the dialog
  const dlg = page.locator('[role="dialog"]').first();
  const scope = (await dlg.count()) ? dlg : page;
  const inputs = scope.locator('input[type="text"], input[type="number"], input:not([type])');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const ph = (await inputs.nth(i).getAttribute('placeholder')) || '';
    if (/search/i.test(ph)) continue;
    await inputs.nth(i).fill(/unit|range|ref/i.test(ph) ? 'g/dL' : '13.5').catch(() => {});
  }
  await page.screenshot({ path: 'shots/lb-06-results-filled.png', fullPage: true });

  const save = scope.getByRole('button', { name: /save|submit|record|enter result/i }).last();
  console.log('save button:', (await save.innerText().catch(()=>'?')).trim());
  await save.click();
  await page.waitForTimeout(7000);
  await page.screenshot({ path: 'shots/lb-07-resulted.png', fullPage: true });
  const st = await page.locator('tr', { hasText: ORDER }).innerText().catch(()=>'');
  console.log('row after saving results:', st.replace(/\s+/g,' ').slice(0, 130));

  const val = page.locator('tr', { hasText: ORDER }).getByRole('button', { name: /Validate/i }).first();
  if (await val.isVisible().catch(()=>false)) {
    await val.click(); await page.waitForTimeout(6000);
    console.log('after validate:', (await page.locator('tr', { hasText: ORDER }).innerText()).replace(/\s+/g,' ').slice(0,130));
    await page.screenshot({ path: 'shots/lb-08-validated.png', fullPage: true });
  } else console.log('no Validate button yet');
});
