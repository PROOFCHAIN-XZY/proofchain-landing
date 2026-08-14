import { test } from '@playwright/test';
test('shot', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.chain__card');
  await page.evaluate(() => document.querySelectorAll('.reveal,[data-lift]').forEach(n => { n.classList.add('is-in'); n.style.opacity=1; n.style.transform='none'; }));
  await page.screenshot({ animations: 'disabled', timeout: 20000, path: '../.cache/shots/full-light.png', fullPage: true });
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(400);
  await page.screenshot({ animations: 'disabled', timeout: 20000, path: '../.cache/shots/full-dark.png', fullPage: true });
});
