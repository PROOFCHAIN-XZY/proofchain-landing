import { expect, test } from '@playwright/test';

/*
 * "No horizontal overflow at any breakpoint" is the first line of the README's
 * Verified section, and it is the claim most easily broken by an innocent
 * change — a long hash, a wide code block, a min-width on a grid child.
 */

test('the page never scrolls horizontally', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.check');

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });

  // Equality rather than a tolerance: a single pixel of body overflow is a
  // real bug, and rounding does not produce one here.
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test('no element extends past the viewport', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.check');

  // A page can pass the document-level check while a child still overhangs,
  // because overflow-x: hidden on body clips it out of scrollWidth. This finds
  // the element itself, and names it, so a failure is actionable.
  const offenders = await page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((node) => {
        // Deliberately scrollable containers are allowed to be wider than the
        // viewport; that is what their own overflow-x is for.
        const scrolls = getComputedStyle(node).overflowX;
        if (scrolls === 'auto' || scrolls === 'scroll') return false;
        if (node.closest('.steps, .terminal, pre')) return false;

        const box = node.getBoundingClientRect();
        if (box.width === 0) return false;
        return box.right > limit + 1 || box.left < -1;
      })
      .slice(0, 5)
      .map((node) => {
        const box = node.getBoundingClientRect();
        const id = node.className && typeof node.className === 'string' ? `.${node.className.trim().split(/\s+/).join('.')}` : '';
        return `${node.tagName.toLowerCase()}${id} [${Math.round(box.left)}…${Math.round(box.right)}]`;
      });
  });

  expect(offenders).toEqual([]);
});

test('the long transaction hash wraps instead of forcing a scroll', async ({ page }) => {
  await page.goto('/');

  // 64 unbroken hex characters in a mono face is the widest single token on
  // the page and the most likely cause of overflow at 375px.
  const hash = page.locator('[data-hash]');
  await expect(hash).toBeVisible();

  const fits = await hash.evaluate(
    (node) => node.getBoundingClientRect().right <= document.documentElement.clientWidth + 1,
  );
  expect(fits).toBe(true);
});

test('every interactive target accepts a tap across 44px', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.check');

  /*
   * Hit-tested, not measured. The copy controls are deliberately small — a
   * chunky button beside a hash would outweigh the evidence it belongs to — so
   * styles.css expands their tap area with a ::after pseudo-element instead of
   * padding. That expansion is invisible to getBoundingClientRect, so a purely
   * geometric assertion reports a failure that does not exist.
   *
   * Probing with elementFromPoint at the top and bottom of a 44px band asks
   * the question that actually matters: if a thumb lands here, does this
   * control receive it?
   */
  const unreachable = await page.evaluate(async () => {
    const MINIMUM = 44;
    const misses = [];

    const controls = [...document.querySelectorAll('a, button')].filter((node) => {
      const box = node.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return false; // inside a hidden panel
      return !node.classList.contains('skip-link'); // off-screen until focused
    });

    for (const node of controls) {
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const box = node.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const centre = box.top + box.height / 2;

      // Inset by a pixel so the probe lands inside the band, not on its edge.
      for (const y of [centre - MINIMUM / 2 + 1, centre + MINIMUM / 2 - 1]) {
        const hit = document.elementFromPoint(x, y);
        if (hit !== node && !node.contains(hit)) {
          misses.push(
            `${node.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 28)}" ` +
              `missed at y offset ${Math.round(y - centre)}`,
          );
          break;
        }
      }
    }

    return misses;
  });

  expect(unreachable).toEqual([]);
});
