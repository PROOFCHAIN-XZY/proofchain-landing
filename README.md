# ProofChain — landing page

Static landing page for [ProofChain](https://github.com/PROOFCHAIN-XZY/proofchain),
a verified waste-to-credit platform on Stellar.

**Live:** https://proofchain-xzy.github.io/proofchain-landing/

No build step, no dependencies, no framework. The published site is still three
files and a licence; everything else is scaffolding that never ships.

```
.
├── index.html          # structure and copy
├── styles.css          # design tokens + all styling
├── main.js             # pipeline stepper, command tabs, copy buttons, reveals
├── 404.html            # served by Pages for any missing address
├── robots.txt          # allows everything; advertises the sitemap
├── sitemap.xml         # one entry, carrying lastmod
├── site.webmanifest    # icons and identity for home-screen installs
├── assets/             # generated — social card and app icons
├── scripts/            # generate assets/; not part of the site
└── tests/              # Playwright; own package.json, not part of the site
```

`assets/` is committed but generated. Re-render it after any change to the
anchor receipt or the palette:

```bash
python3 -m pip install pillow
python3 scripts/build-og.py        # assets/og.png, the 1200x630 share card
python3 scripts/build-icons.py     # app and apple-touch icons
```

## Run it locally

```bash
python3 -m http.server 8080     # then open http://localhost:8080
```

Opening `index.html` directly over `file://` also works, except that the
clipboard API is blocked in some browsers — the copy buttons report
"Copy failed" rather than silently pretending to succeed.

## Design direction

Documentary evidence, not a brochure. The page deliberately reads like the audit
artifact it is selling: paper stock, hairline rules instead of card shadows,
tabular numerals, and colour reserved strictly for verification state
(`--verified` / `--pending` / `--broken`). It extends the language already
established in `apps/dashboard/src/app/globals.css` so the marketing surface and
the operator tool feel like one system.

Type is a motivated triple stack rather than a UI default:

| Role | Family | Why |
|------|--------|-----|
| Display | Newsreader | A news serif built for long-form argument; its italic carries the hero emphasis |
| Interface | Public Sans | The US public-records typeface — made for government documents |
| Evidence | JetBrains Mono | True tabular figures for hashes, weights and ledger numbers |

All three fall back to system stacks, so the page still reads correctly offline.

## Structure

Five sections, deliberately unequal in weight — uniform section heights are what
make a page read as documentation rather than a landing page:

| Section | Weight | Role |
|---------|--------|------|
| Hero + anchor receipt | 1.0 screen | The claim and the evidence for it, together |
| The problem | 0.4 | One statement: the incentive to cheat |
| Pipeline | 1.2 | The centrepiece — weigh-in to audit report |
| Integrity v1 | 0.8 | Seven checks, one line each |
| Verify it yourself | 1.0 | The differentiator: run it on your own machine |
| Scope | 0.8 | What this release does *not* prove |
| Closing + footer | 1.0 | Single CTA |

Total ≈ 6.3 screens at 1440×900.

Deliberately **not** on the page, because the repo documents them better:

- The architecture diagram → `docs/architecture.md`
- Per-check rationale → `docs/architecture.md`
- The end-to-end demo transcript → `README.md`

## Editing content

Copy for the three data-driven sections lives at the top of `main.js`, not in
the markup:

- `PIPELINE` — the six capture-to-report stages and their sample records
- `CHECKS` — the seven integrity v1 checks and what each defends against
- `COMMANDS` — the four verification commands in the "Don't trust us" section

Everything else is authored directly in `index.html`.

The single call to action — "Verify a sample batch" — points at the live
testnet transaction on stellar.expert. It appears in three places: the masthead,
the hero, and the closing section.

## Facts on the page

The anchor receipt in the hero is a real testnet run, not a mockup — transaction
`3fb0f496…dc512f`, ledger 4033690, 100 stroops. If the pilot is re-anchored, the
hash has to change in `index.html`, `main.js` and `scripts/build-og.py`, and
`assets/og.png` has to be re-rendered.

You no longer have to remember that. `consistency.spec.js` fails if any
64-character hash other than the live one survives anywhere in the source, so a
half-finished re-anchor cannot ship.

```bash
grep -rn 3fb0f496 index.html main.js scripts/build-og.py
```

The other hard numbers were checked against
[PROOFCHAIN-XZY/proofchain](https://github.com/PROOFCHAIN-XZY/proofchain) and
hold:

| Claim | Source | Status |
|-------|--------|--------|
| 7 integrity checks | `apps/backend/src/events/integrity.ts` | ✓ all seven names match, and the order on the page matches the order they run in |
| 46 trust-kernel tests | `packages/shared` | ✓ |
| $140–800 per tonne | upstream `README.md` | ✓ |

One correction came out of that pass: `clock_plausible` was badged **warn**,
but the implementation returns a hard **fail** for an unparseable or
future-dated `capturedAt`. It now shows both. The page's whole argument is that
it does not overstate — understating a check is the same failure wearing a
modest hat.

The check names are pinned by `consistency.spec.js`, so a rename upstream
becomes a failing test here rather than a page quietly describing a system that
no longer exists.

## Verified

The claims below are not asserted, they are tested. `tests/` holds a Playwright
suite that runs on every push and pull request, and Pages only deploys if it
passes.

```bash
cd tests
npm install
npx playwright install chromium
npx playwright test              # 100 checks, ~20s
```

The suite has its own `package.json` so the published site stays
dependency-free, and it serves the parent directory with the same
`python3 -m http.server` command documented above — so it exercises the setup
a reader is told to use, not a private one.

Five projects cover 375 / 768 / 1440 px against the layout breakpoints in
`styles.css`, with dark as a separate project because the palette is redefined
wholesale under `prefers-color-scheme`. What is pinned:

| Check | Where |
|-------|-------|
| No horizontal overflow, at the document *and* the element level | `responsive.spec.js` |
| Every interactive target reachable across 44 px, hit-tested not measured | `responsive.spec.js` |
| All text passes WCAG AA in light **and** dark — 225 nodes per project | `a11y.spec.js` |
| Tablist keyboard semantics, and the orientation the stepper reports | `a11y.spec.js` |
| `prefers-reduced-motion` leaves no content stuck at `opacity: 0` | `a11y.spec.js` |
| No console errors; all six/seven/four sections actually render | `render.spec.js` |
| One transaction hash across every file that cites one | `consistency.spec.js` |
| No URL outside the canonical host; every referenced asset exists | `consistency.spec.js` |
| The seven check names still match `events/integrity.ts` upstream | `consistency.spec.js` |

The two greys `--ink-faint` and `--terminal-faint` are tuned to sit just above
the AA threshold and are the first things to break if the palette is nudged.
The contrast test is what will tell you.

Two caveats on what the suite does *not* cover. It runs Chromium only —
cross-browser rendering is still a manual check. And it asserts no screenshots,
so a layout can regress into something ugly while remaining correct.
