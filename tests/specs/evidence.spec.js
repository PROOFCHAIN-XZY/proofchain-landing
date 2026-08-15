import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

/*
 * The evidence the page asks a reader to act on: the four Merkle rules a
 * recomputation depends on, the custody node that admits a reconciliation gap,
 * and a guard against invented figures reaching the page.
 *
 * The Merkle block is the part of the page with the least tolerance for drift.
 * Everything else can be checked against the live report; these four rules are
 * the instructions for doing that checking, so if they are wrong the reader
 * follows them faithfully, gets a different root, and concludes the pilot is
 * fabricated.
 */

// Same derivation as consistency.spec.js: import.meta.dirname is rewritten by
// Playwright's loader into a CommonJS require that does not exist here.
const root = () => join(test.info().config.rootDir, '..', '..');
const read = (name) => readFileSync(join(root(), name), 'utf8');

test('the construction block states four rules, and names each one', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const rules = page.locator('.merkle .merkle__rule');
  await expect(rules).toHaveCount(4);

  // The prose above the grid promises "three deliberate departures from the
  // naive Merkle tree, plus the ordering". Dropping or adding a rule leaves
  // that sentence counting something that is no longer on the page.
  await expect(page.locator('.merkle__name')).toHaveText([
    'Domain separation',
    'Positional pairing',
    'Odd nodes promoted',
    'Fixed ordering',
  ]);
});

test('the domain-separation prefixes are the ones that make the tree sound', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const spec = await page.locator('.merkle__spec').first().innerText();
  const [leaf, node] = spec.split('\n');

  // These two prefixes are the whole of the second-preimage defence: a leaf is
  // hashed under 0x00 and an internal node under 0x01, so a 32-byte
  // intermediate hash can never be replayed as if it were a weigh-in. A page
  // that prints them the wrong way round, or with one prefix on both, is
  // strictly worse than a page that says nothing about domain separation —
  // it hands a reader a rule that quietly does not work.
  expect(leaf, 'the leaf expression must be prefixed 0x00').toContain('sha256(0x00');
  expect(node, 'the node expression must be prefixed 0x01').toContain('sha256(0x01');

  expect(leaf).toContain('leaf =');
  expect(node).toContain('node =');
});

test('the ordering rule gives the exact sort a reader must reproduce', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // "Sorted chronologically" would not be enough. Two events captured in the
  // same second build different trees under different tie-breaks, so the
  // secondary key has to be stated or the invitation to recompute is hollow.
  await expect(page.locator('.merkle__spec').nth(3)).toContainText('capturedAt ASC, id ASC');
});

test('every rule names the attack it stops', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const stops = page.locator('.merkle__stops');
  await expect(stops).toHaveCount(4);

  // A rule without its threat reads as arbitrary implementation trivia, and is
  // the first thing a later editor deletes for space. Each one is here because
  // removing it breaks something specific.
  for (const [i, text] of (await stops.allTextContents()).entries()) {
    expect(text.replace(/^Stops/, '').trim().length, `rule ${i + 1} should name an attack`)
      .toBeGreaterThan(0);
  }
});

test('the custody chain admits the reconciliation gap and what would justify one', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const reconciled = page.locator('.chain__node').filter({
    has: page.locator('.chain__step', { hasText: 'Reconciled' }),
  });
  await expect(reconciled).toHaveCount(1);

  await expect(reconciled.locator('.chain__value')).toHaveText('0.000 kg');

  // A zero gap on its own reads as a boast. The note is what makes it a
  // process claim rather than a lucky number: a non-zero gap is writable, but
  // only with a reason attached, which is the part an auditor can test.
  await expect(reconciled.locator('.chain__note')).toContainText(/reason/i);
});

test('none of the mocked-up figures reached the page', async ({ page: _page }) => {
  const sources = ['index.html', 'main.js'];

  /*
   * The marketing mockups invented values that look exactly like the real
   * ones. The pilot's actual figures are transaction 3fb0f496…dc512f, root
   * e1a4…7f30 and ledger 4033690; the mockups disagreed with all three, and
   * carried a dashboard of round numbers besides. A fabricated hash on this
   * page in particular is unrecoverable — the entire argument is that every
   * number here can be looked up, so one that cannot be is proof of the
   * opposite.
   */
  const fabricated = [
    'a6d3f', // fake transaction hash
    '9e8b7c',
    '2f8a7', // fake Merkle root
    'b91c3d',
    '94386239', // fake ledger number
    '2,450', // invented dashboard metrics
    '1,248',
    '98.6%',
    '6,782',
    'USDC', // roadmap items the Scope section lists as not built
    'Parametric',
  ];

  for (const name of sources) {
    const body = read(name);
    for (const value of fabricated) {
      expect(body, `${name} still contains the fabricated value "${value}"`).not.toContain(value);
    }
  }

  /*
   * Verra cannot be banned outright: the Scope section names it precisely in
   * order to disclaim it ("Verra accreditation — this is a technical proof,
   * not a credit issuer"), and deleting that line would remove a refusal the
   * page needs. What must never appear is the word in a claiming context, so
   * the check is that every mention sits inside that disclaimer.
   */
  for (const name of sources) {
    const mentions = read(name).match(/[^\n]*Verra[^\n]*/g) ?? [];
    for (const line of mentions) {
      expect(line, `${name} mentions Verra outside the Scope disclaimer`).toContain(
        '<b>Verra accreditation</b>',
      );
    }
  }
});
