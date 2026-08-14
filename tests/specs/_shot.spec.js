import { test } from '@playwright/test';
test('shot', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.summary__item');
  await page.locator('.summary').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator('.summary').screenshot({ animations: 'disabled', timeout: 15000, path: '../.cache/shots/summary.png' });
});
