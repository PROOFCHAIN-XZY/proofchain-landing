import { expect, test } from '@playwright/test';

/*
 * The three structures adapted from the uploaded design reference: the chain
 * of custody, the summary bar, and a navigation that exists on phones.
 *
 * docs/design-reference.md records what was taken and what was refused. These
 * pin the parts that are easy to break by accident.
 */

test('the chain shows four states in order', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const nodes = page.locator('.chain__node');
  await expect(nodes).toHaveCount(4);

  // An ordered list, because the sequence is the argument. A row of divs would
  // read to a screen reader as four unrelated cards.
  await expect(page.locator('ol.chain')).toHaveCount(1);

  await expect(page.locator('.chain__step')).toHaveText([
    /Signed/,
    /Checked/,
    /Sealed/,
    /On the ledger/,
  ]);
});

test('every chain value is real, and the last one is checkable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The values must agree with the hero receipt: both describe the same run,
  // and a diagram carrying different numbers from the receipt beside it would
  // discredit the page more effectively than having no diagram.
  await expect(page.locator('.chain__value').nth(2)).toHaveText('e1a4…7f30');

  const anchor = page.locator('a.chain__value');
  await expect(anchor).toHaveCount(1);
  await expect(anchor).toHaveAttribute(
    'href',
    /stellar\.expert\/explorer\/testnet\/tx\/3fb0f496.*dc512f/,
  );
});

test('the connectors name the operation and stay out of the reading order', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const links = page.locator('.chain__link');
  await expect(links).toHaveCount(3); // between four nodes, never after the last
  await expect(links).toHaveText([/submitted/i, /batched/i, /anchored/i]);

  // Decorative: the operation names are already implied by the states either
  // side, so announcing them again would pad the list with noise.
  for (const handle of await links.all()) {
    await expect(handle).toHaveAttribute('aria-hidden', 'true');
  }
});

test('the summary bar carries five claims the page can support', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const items = page.locator('.summary__item');
  await expect(items).toHaveCount(5);

  const text = (await items.allTextContents()).join(' ').toLowerCase();

  // Guards against the reference's closing item drifting back in. 'Real
  // Impact — turn verified waste into trusted credits and cleaner
  // communities' is the exact register the Scope section exists to refuse.
  for (const overclaim of ['cleaner planet', 'cleaner communities', 'real impact', 'trusted credits']) {
    expect(text, `summary should not claim "${overclaim}"`).not.toContain(overclaim);
  }
});

test('phones get a navigation', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const nav = page.locator('.masthead nav');
  const toggle = page.locator('[data-menu-toggle]');
  const narrow = testInfo.project.use.viewport.width < 896; // 56rem

  if (!narrow) {
    // Above the breakpoint the nav is simply present and the button is not.
    await expect(nav).toBeVisible();
    await expect(toggle).toBeHidden();
    return;
  }

  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();

  await toggle.click();
  await expect(nav).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  // Following a link closes the panel rather than leaving it over the section
  // the reader just asked for.
  await nav.getByRole('link', { name: 'Scope' }).click();
  await expect(nav).toBeHidden();

  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the collapsed nav cannot exist without its button', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The collapse is scoped to [data-enhanced], which only main.js sets. If the
  // script never runs the nav stays open, so a half-loaded page can never be a
  // page with no reachable navigation.
  const enhanced = await page.getAttribute('.masthead', 'data-enhanced');
  expect(enhanced).toBe('true');

  await page.evaluate(() => document.querySelector('.masthead').removeAttribute('data-enhanced'));
  await expect(page.locator('.masthead nav')).toBeVisible();
});
