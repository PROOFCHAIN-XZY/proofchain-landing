import { test } from '@playwright/test';
test('shot', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.check');
  const opts = { animations: 'disabled', timeout: 15000 };
  await page.screenshot({ ...opts, path: '../.cache/shots/light.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(300);
  await page.screenshot({ ...opts, path: '../.cache/shots/dark.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
});
