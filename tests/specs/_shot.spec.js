import { test } from '@playwright/test';
test('shot', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.chain__card');
  await page.locator('.chain').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.locator('.chain').screenshot({ animations: 'disabled', timeout: 15000, path: '../.cache/shots/chain.png' });
});
