import { expect, test } from '@playwright/test';

/*
 * The three data-driven sections are rendered by main.js at load. If the
 * script throws anywhere, they are empty headings and the page silently loses
 * over half its argument — the exact failure the <noscript> fallback exists to
 * name and these tests exist to catch.
 */

test('the page loads without console errors or failed requests', async ({ page }) => {
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  page.on('requestfailed', (request) => {
    // The webfont host is a third party and may be unreachable offline. The
    // page is designed to survive that, so it is not a failure of the page.
    if (request.url().includes('fonts.googleapis.com')) return;
    if (request.url().includes('fonts.gstatic.com')) return;
    problems.push(`request failed: ${request.url()}`);
  });

  await page.goto('/');
  await expect(page.locator('.step').first()).toBeVisible();

  expect(problems).toEqual([]);
});

test('every data-driven section renders its full content', async ({ page }) => {
  await page.goto('/');

  // Six pipeline stages, seven integrity checks, four verification commands.
  // Hard-coded rather than read from main.js: a test that derives its
  // expectation from the code under test cannot detect the count changing.
  await expect(page.locator('.step')).toHaveCount(6);
  await expect(page.locator('.check')).toHaveCount(7);
  await expect(page.locator('.tabs .tab')).toHaveCount(4);
});

test('exactly one panel is visible per tablist', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-panels] .panel:not([hidden])')).toHaveCount(1);
  await expect(page.locator('[data-terminals] .panel:not([hidden])')).toHaveCount(1);
});

test('the anchor receipt shows the transaction that the links point at', async ({ page }) => {
  await page.goto('/');

  const hash = '3fb0f496f209507098e6439c646a60d6a576de856a28afbb4f44598b77dc512f';

  // The receipt is the page's central factual claim. If the hash on screen and
  // the hash in the explorer link ever diverge, the page is citing evidence
  // that does not support it.
  await expect(page.locator('[data-hash]')).toHaveText(hash);

  // At least one *visible* link must reach the explorer. Asserting on .first()
  // was wrong: below 56rem the masthead call to action is deliberately hidden,
  // so the first match in DOM order is a link nobody can see, and the test
  // failed on a page that was behaving correctly.
  await expect(page.locator(`a[href*="${hash}"]:visible`).first()).toBeVisible();

  const copyValue = await page.locator('button.copy[data-copy]').first().getAttribute('data-copy');
  expect(copyValue).toBe(hash);
});

test('clock_plausible is shown as both a fail and a warn', async ({ page }) => {
  await page.goto('/');

  // Regression guard. The check is the only one with two outcomes, and it was
  // previously badged 'warn' alone, understating what events/integrity.ts does.
  const row = page.locator('.check', { has: page.getByText('clock_plausible', { exact: true }) });
  await expect(row.locator('.check__verdict')).toHaveText(['fail', 'warn']);
});
