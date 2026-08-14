import { expect, test } from '@playwright/test';

/*
 * The README warns that --ink-faint and --terminal-faint are tuned to sit just
 * above the AA threshold and are the first things to break if the palette is
 * nudged. That is exactly the kind of warning nobody reads before nudging a
 * palette, so it is asserted here instead.
 */

/** WCAG relative luminance, then the standard contrast ratio. */
const CONTRAST_HELPERS = `
  function channel(value) {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance([r, g, b]) {
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function ratio(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /*
   * Resolve any CSS colour to straight RGBA by painting one pixel and reading
   * it back. Scraping numbers out of the computed string does not survive
   * contact with this stylesheet: the masthead background is a color-mix() in
   * oklab, which Chromium serialises in oklab coordinates, and reading those
   * three numbers as if they were RGB channels yields near-black — making
   * every masthead link look like a catastrophic contrast failure when the
   * real backdrop is paper. Canvas does the conversion the renderer does.
   */
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function parse(colour) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = colour;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    // getImageData returns premultiplied-then-unpacked bytes; undo the alpha
    // so the caller composites explicitly rather than against canvas black.
    const alpha = a / 255;
    return alpha === 0 ? [0, 0, 0, 0] : [r / alpha, g / alpha, b / alpha, alpha];
  }

  function over(top, bottom) {
    const a = top[3];
    return [
      top[0] * a + bottom[0] * (1 - a),
      top[1] * a + bottom[1] * (1 - a),
      top[2] * a + bottom[2] * (1 - a),
      1,
    ];
  }

  /*
   * The effective backdrop, composited the way the compositor does it: collect
   * every ancestor background from the root down and paint them over each
   * other. Stopping at the first non-transparent ancestor would be wrong for
   * the translucent sticky masthead, which is the one case on this page where
   * text sits on a partly see-through surface.
   */
  function backdrop(node) {
    const chain = [];
    for (let current = node; current; current = current.parentElement) chain.unshift(current);

    let result = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (result[3] === 0) result = [255, 255, 255, 1];

    for (const ancestor of chain) {
      const layer = parse(getComputedStyle(ancestor).backgroundColor);
      if (layer[3] > 0) result = over(layer, result);
    }
    return result;
  }
`;

test('all visible text passes WCAG AA contrast', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.check');

  const failures = await page.evaluate(`(() => {
    ${CONTRAST_HELPERS}

    const failures = [];
    const nodes = document.querySelectorAll(
      'p, li, dt, dd, h1, h2, h3, h4, span, a, button, b, i, code'
    );

    for (const node of nodes) {
      const text = [...node.childNodes]
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent.trim())
        .join('');
      if (!text) continue;

      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.opacity === '0') continue;

      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      // AA large text is 18.66px at 400, or 14px at 700 and above.
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const required = large ? 3 : 4.5;

      const found = ratio(parse(style.color), backdrop(node));
      if (found < required) {
        failures.push(
          node.tagName.toLowerCase() + '.' + (node.className || '-') +
          ' "' + text.slice(0, 24) + '" ' + found.toFixed(2) + ':1 < ' + required
        );
      }
    }

    return [...new Set(failures)].slice(0, 8);
  })()`);

  expect(failures).toEqual([]);
});

test('the skip link becomes visible and reaches main on focus', async ({ page }) => {
  await page.goto('/');

  const skip = page.locator('.skip-link');
  await skip.focus();
  await expect(skip).toBeInViewport();
  await expect(skip).toHaveAttribute('href', '#main');
  await expect(page.locator('#main')).toHaveCount(1);
});

test('the pipeline stepper follows tablist keyboard semantics', async ({ page }) => {
  await page.goto('/');

  const steps = page.locator('.step');
  await steps.first().focus();

  await page.keyboard.press('ArrowDown');
  await expect(steps.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(steps.first()).toHaveAttribute('aria-selected', 'false');

  // Only the selected tab is reachable by Tab; the rest are arrow-navigated.
  await expect(steps.nth(1)).toHaveAttribute('tabindex', '0');
  await expect(steps.first()).toHaveAttribute('tabindex', '-1');

  await page.keyboard.press('End');
  await expect(steps.last()).toHaveAttribute('aria-selected', 'true');

  // Wraps from the last tab back to the first.
  await page.keyboard.press('ArrowDown');
  await expect(steps.first()).toHaveAttribute('aria-selected', 'true');
});

test('the stepper reports the orientation it is drawn in', async ({ page }, testInfo) => {
  await page.goto('/');

  // .steps switches from a scrolling row to a sticky column at 68rem (1088px).
  const expected = testInfo.project.use.viewport.width >= 1088 ? 'vertical' : 'horizontal';
  await expect(page.locator('[data-steps]')).toHaveAttribute('aria-orientation', expected);
});

test('reduced motion removes animation without hiding content', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForSelector('.check');

  // The failure mode worth guarding is not "still animates" — it is a reveal
  // that starts at opacity 0 and never gets its class, leaving content
  // permanently invisible to anyone who asked for less motion.
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('.reveal, [data-lift]')]
      .filter((node) => Number(getComputedStyle(node).opacity) < 0.99)
      .map((node) => node.tagName.toLowerCase() + '.' + node.className),
  );
  expect(hidden).toEqual([]);

  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('.reveal, [data-lift]')].filter((node) => {
      const style = getComputedStyle(node);
      const duration = parseFloat(style.animationDuration) + parseFloat(style.transitionDuration);
      return duration > 0.05;
    }).length,
  );
  expect(animated).toBe(0);

  await context.close();
});
