# ProofChain — landing page

Static landing page for [ProofChain](https://github.com/PROOFCHAIN-XZY/proofchain),
a verified waste-to-credit platform on Stellar.

**Live:** https://proofchain-xzy.github.io/proofchain-landing/

No build step, no dependencies, no framework — three files and a licence.

```
.
├── index.html   # structure and copy
├── styles.css   # design tokens + all styling
└── main.js      # pipeline stepper, command tabs, copy buttons, reveals
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
`3fb0f496…dc512f`, ledger 4033690, 100 stroops. If the pilot is re-anchored,
update the hash everywhere it appears:

```bash
grep -rn 3fb0f496 index.html main.js     # 8 occurrences
```

Confirm the other hard numbers against the repo before this goes public — the
7 checks, 46 trust-kernel tests, and the $140–800/tonne figure. The page's whole
argument is that it does not overstate, so a stale number costs more here than
it would elsewhere.

## Verified

Checked with Playwright at 375 / 768 / 1440 px in both colour schemes:

- No horizontal overflow at any breakpoint
- All body and label text passes WCAG AA contrast in light **and** dark
- All interactive targets ≥ 44 px
- No console errors
- `prefers-reduced-motion` suppresses all motion with no content left hidden

Re-run those checks after any significant change; the two greys `--ink-faint`
and `--terminal-faint` are tuned to sit just above the AA threshold and are the
first things to break if the palette is nudged.
