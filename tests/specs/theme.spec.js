import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const root = () => join(test.info().config.rootDir, '..', '..');

/*
 * The dark palette is declared twice — once for the system preference, once
 * for an explicit choice — because CSS cannot share a declaration list between
 * a media rule and a plain selector. That duplication is a standing hazard:
 * tune one block, forget the other, and the theme quietly disagrees with
 * itself depending on how the reader arrived at it.
 */
test('both dark blocks define exactly the same tokens', () => {
  const css = readFileSync(join(root(), 'styles.css'), 'utf8');

  const block = (marker) => {
    const start = css.indexOf(marker);
    expect(start, `${marker} should exist in styles.css`).toBeGreaterThan(-1);
    const body = css.slice(start, css.indexOf('}', css.indexOf('--terminal-rule', start)));
    return Object.fromEntries(
      [...body.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
    );
  };

  const inherited = block(':root:not([data-theme="light"]) {');
  const chosen = block(':root[data-theme="dark"] {');

  // Compared as maps, so a failure names the token that drifted rather than
  // just reporting that two long strings differ.
  expect(Object.keys(chosen).length).toBeGreaterThan(15);
  expect(chosen).toEqual(inherited);
});

test('the toggle switches the theme and says what it will do', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const html = page.locator('html');
  const button = page.locator('[data-theme-toggle]');
  const label = page.locator('[data-theme-label]');

  const started = await page.evaluate(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const opposite = started === 'dark' ? 'light' : 'dark';

  // Before any click the page follows the system and the attribute is unset —
  // a toggle that stamps an attribute on load has already stopped following.
  await expect(html).not.toHaveAttribute('data-theme', /.+/);
  await expect(label).toHaveText(`Switch to ${opposite} theme`);
  await expect(button).toHaveAttribute('aria-pressed', String(started === 'dark'));

  await button.click();
  await expect(html).toHaveAttribute('data-theme', opposite);
  await expect(label).toHaveText(`Switch to ${started} theme`);

  await button.click();
  await expect(html).toHaveAttribute('data-theme', started);
});

test('an explicit choice beats the system preference', async ({ browser }) => {
  // The bug this pins: the dark tokens used to live only inside the media
  // query, so asking for dark in a light browser changed the attribute and
  // nothing else.
  const context = await browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.locator('[data-theme-toggle]').click();

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r, g, b] = background.match(/\d+/g).map(Number);
  expect(r + g + b, `body should be dark, got ${background}`).toBeLessThan(180);

  await context.close();
});

test('the choice survives a reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-theme-toggle]').click();
  const chosen = await page.getAttribute('html', 'data-theme');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', chosen);
});

test('the theme is applied before the stylesheet loads', () => {
  /*
   * Structural rather than behavioural. Racing an actual paint from the test
   * runner is unreliable — by the time an evaluate round-trips, deferred
   * scripts have run — but what prevents the flash is a source-order property
   * that can be checked exactly: the inline script that reads the stored
   * choice must run before the stylesheet that would paint the other theme,
   * and it must not be deferred or external.
   */
  const html = readFileSync(join(root(), 'index.html'), 'utf8');

  const script = html.indexOf('proofchain-theme');
  const stylesheet = html.indexOf('href="styles.css"');

  expect(script, 'the theme script should exist').toBeGreaterThan(-1);
  expect(stylesheet, 'styles.css should be linked').toBeGreaterThan(-1);
  expect(script, 'the theme script must precede styles.css').toBeLessThan(stylesheet);

  // A defer, async or src attribute on that block would move it after paint
  // and reintroduce the flash it exists to prevent.
  const tag = html.slice(html.lastIndexOf('<script', script), script);
  expect(tag).not.toMatch(/\b(defer|async|src)\b/);
});

test('a page with no stored choice still follows the system', async ({ browser }) => {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const sum = background.match(/\d+/g).map(Number).slice(0, 3).reduce((a, b) => a + b, 0);

    if (scheme === 'dark') expect(sum, `dark system, got ${background}`).toBeLessThan(180);
    else expect(sum, `light system, got ${background}`).toBeGreaterThan(600);

    await context.close();
  }
});
