import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

/*
 * Static checks over the source, not the rendered page. These guard the class
 * of mistake this project can least afford: the page citing evidence that has
 * moved, gone stale, or never existed.
 *
 * README.md tells a maintainer re-anchoring the pilot to run
 *   grep -rn 3fb0f496 index.html main.js
 * and update every hit. That instruction depends on a human running it and
 * counting correctly, which is the part these tests replace.
 */

// Derived from the resolved testDir rather than import.meta.dirname, which
// Playwright's loader rewrites to a CommonJS require that is not defined here,
// or from cwd, which depends on where the runner was invoked.
const root = () => join(test.info().config.rootDir, '..', '..');
const read = (name) => readFileSync(join(root(), name), 'utf8');

const TX = '3fb0f496f209507098e6439c646a60d6a576de856a28afbb4f44598b77dc512f';
const LEDGER = '4033690';
const SITE = 'https://proofchain-xzy.github.io/proofchain-landing';

// Run once rather than per viewport — none of this depends on the browser.
test.describe.configure({ mode: 'parallel' });

test('one transaction hash, everywhere it appears', () => {
  const sources = ['index.html', 'main.js', 'scripts/build-og.py', 'README.md'];

  for (const name of sources) {
    const body = read(name);
    // Any 64-char hex string in these files is a transaction hash or a Merkle
    // root; the roots on the page are all elided to eight characters, so a
    // full-length one that is not TX is a stale anchor left behind.
    const hashes = new Set(body.match(/\b[0-9a-f]{64}\b/g) ?? []);
    hashes.delete(TX);
    expect(hashes, `unexpected 64-char hash in ${name}`).toEqual(new Set());
  }

  // And it does appear — a rename that dropped it entirely would otherwise
  // satisfy the check above.
  expect(read('index.html')).toContain(TX);
  expect(read('main.js')).toContain(TX);
});

test('the ledger number agrees across the page and the card', () => {
  for (const name of ['index.html', 'main.js', 'scripts/build-og.py']) {
    expect(read(name), `${name} should cite ledger ${LEDGER}`).toContain(LEDGER);
  }
});

test('every absolute site URL uses the canonical host', () => {
  const html = read('index.html');

  // The repository moved to the PROOFCHAIN-XZY organisation. A link left
  // pointing at a personal namespace still resolves today, through a redirect
  // that disappears the moment that account renames anything.
  expect(html).not.toContain('victorisiguzoruzoma874');
  expect(read('README.md')).not.toContain('victorisiguzoruzoma874');

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  expect(canonical).toBe(`${SITE}/`);

  for (const property of ['og:url', 'og:image', 'twitter:image']) {
    const pattern = new RegExp(`(?:property|name)="${property}"\\s+content="([^"]+)"`, 's');
    const value = html.replace(/\n\s*/g, ' ').match(pattern)?.[1];
    expect(value, `${property} should be an absolute URL on the canonical host`).toMatch(
      new RegExp(`^${SITE.replace(/[.]/g, '\\.')}`),
    );
  }
});

test('every local asset referenced by the page exists', () => {
  const html = read('index.html');
  const assets = readdirSync(join(root(), 'assets'));

  for (const match of html.matchAll(/(?:href|content|src)="(?:[^"]*\/)?assets\/([^"]+)"/g)) {
    expect(assets, `index.html references assets/${match[1]}`).toContain(match[1]);
  }

  // The manifest is loaded by the browser, not the test runner, so its icon
  // list is checked here rather than left to a silent 404 on install.
  const manifest = JSON.parse(read('site.webmanifest'));
  for (const icon of manifest.icons) {
    expect(assets, `manifest references ${icon.src}`).toContain(icon.src.replace('assets/', ''));
  }
});

test('the social card is the size its metadata promises', () => {
  const png = readFileSync(join(root(), 'assets', 'og.png'));

  // PNG IHDR: width and height are big-endian uint32 at bytes 16 and 20.
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);

  expect({ width, height }).toEqual({ width: 1200, height: 630 });

  const html = read('index.html').replace(/\n\s*/g, ' ');
  expect(html).toContain('property="og:image:width" content="1200"');
  expect(html).toContain('property="og:image:height" content="630"');
});

test('the integrity check list matches the upstream implementation', () => {
  // The seven names as they appear in apps/backend/src/events/integrity.ts.
  // If the backend adds, removes or renames a check, this page is overstating
  // or understating what runs at ingest until it is updated too.
  const expected = [
    'device_enrolled',
    'signature_valid',
    'geofence_ok',
    'weight_in_range',
    'not_duplicate',
    'clock_plausible',
    'photo_present',
  ];

  const js = read('main.js');
  const checksBlock = js.slice(js.indexOf('const CHECKS'), js.indexOf('const COMMANDS'));
  const names = [...checksBlock.matchAll(/name: '([a-z_]+)'/g)].map((m) => m[1]);

  expect(names).toEqual(expected);
});
