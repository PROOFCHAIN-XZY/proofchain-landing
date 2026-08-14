# Design reference — what was taken, and what was not

A dark product-marketing mockup was supplied as a visual reference for this
page. This records what it changed, what it did not, and why — so the next
person to see the mockup does not have to re-litigate decisions that were made
deliberately.

The short version: the reference's **structure** was adopted, its **finish**
was not.

## What the reference is

Analysed against the `ui-ux-pro-max` pattern database, it resolves to
**Enterprise Gateway** crossed with **Feature-Rich Showcase**, rendered in
**Dimensional Layering / Modern Dark**:

| Element | Reference |
|---------|-----------|
| Nav | Mega menu (`Solutions ▾`), `Log In` ghost + `Request Access` solid |
| Hero | Left copy, right photograph with floating glass cards over it |
| Evidence | Weigh-in card → hash card → Stellar anchor card, joined by glowing lines |
| Below fold | Five-item feature strip in a rounded translucent panel |
| Base | `#0a1420`–`#0d1a26`, blue-tinted rather than neutral |
| Accent | `#22c55e`–`#2dd36f` green, plus cyan `#00d4ff` bloom |
| Type | One heavy grotesque, tight tracking. No serif, no mono |
| Surfaces | `rgba(255,255,255,0.04)`, hairline white borders, backdrop blur, 8–12px radius |

Colour values are read off the image and approximate.

## Adopted

**The evidence chain.** The reference's strongest idea by a distance: it draws
the chain of custody as connected cards instead of describing it. This page had
the same argument in two places — a static receipt in the hero and a stepper
showing one stage at a time — and nowhere that showed the whole thing at once.
Now four states (signed, checked, sealed, on the ledger) with the operation
named on each connector.

**The five-part summary bar.** Placed directly under the hero, as in the
reference. It answers what the product is before a reader commits to a screen
of argument — a table of contents, not a feature list.

**A trust signal for Stellar**, in the position the reference uses, where it
reads as a credential rather than a claim.

**A dark theme that is chosen rather than only inherited.** The reference is
dark-first; this page is not, but its dark palette was previously reachable
only through a system preference. It is now a first-class, switchable theme.

**A navigation on phones.** Not from the reference so much as exposed by it:
`.masthead nav` was `display: none` below 56rem, so a phone had no section
links at all. The reference's loud nav made the absence obvious.

## Refused

**The hero photograph.** No such asset exists, and sourcing a stock or
generated image of a waste collector is the sector's signature failure — the
`ui-ux-pro-max` database lists *Greenwashing* and *No real data* as the two
anti-patterns for this product type. This page's hero advantage is that it
shows a real testnet transaction rather than a mood.

**The dark-first, glass-and-glow finish.** The page's stated direction is
documentary evidence, not a brochure: paper stock, hairline rules instead of
card shadows, and colour reserved strictly for verification state. Backdrop
blur, bloom and gradient CTAs argue the opposite — that the surface is worth
looking at for its own sake.

**The all-sans type stack.** The serif carries the hero's emphasis and the mono
carries every hash on the page. Collapsing to one grotesque would cost both.

**The nav as shown.** `Solutions`, `Platform`, `Impact`, `About Us` and a
`Log In` describe a five-page site with an authenticated product. This is one
page and there is nothing to log into. Dead nav is expensive on a page whose
thesis is that it does not overstate.

**`Real Impact — turn verified waste into trusted credits and cleaner
communities`.** The reference's fifth feature item. The Scope section exists to
refuse exactly this register. `reference.spec.js` fails if that phrasing drifts
back into the summary bar.

## A caveat on the reference itself

The mockup is AI-generated — the `Ledger` label inside its anchor card is
garbled, and the tablet geometry does not resolve. It was treated as a mood
board, not a specification. Nothing in it should be measured off.
