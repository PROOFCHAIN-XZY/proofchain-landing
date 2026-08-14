import { expect, test } from '@playwright/test';
test('mobile nav', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.summary__item');
  const nav = page.locator('.masthead nav');
  await expect(nav).toBeHidden();
  await page.screenshot({ animations: 'disabled', path: '../.cache/shots/m-closed.png', clip: {x:0,y:0,width:375,height:220} });
  await page.click('[data-menu-toggle]');
  await expect(nav).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '../.cache/shots/m-open.png', clip: {x:0,y:0,width:375,height:220} });
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
});
