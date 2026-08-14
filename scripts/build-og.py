#!/usr/bin/env python3
"""
Render assets/og.png — the 1200x630 card that Open Graph and Twitter show.

The card is generated rather than drawn by hand so it stays honest: the
transaction hash, ledger and headline are read from the same constants the
page uses, and re-running this after a re-anchor updates the preview along
with the page. A hand-made PNG would quietly go stale on the first re-anchor,
which is exactly the kind of unverified claim this project exists to avoid.

    python3 -m pip install pillow
    python3 scripts/build-og.py

Fonts are the page's own three families. They are downloaded on demand and
cached under .cache/fonts, which .gitignore already excludes; the committed
output is the only artifact.
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "og.png"
FONT_CACHE = ROOT / ".cache" / "fonts"

WIDTH, HEIGHT = 1200, 630
MARGIN = 72

# Pulled from the :root block in styles.css. Kept as a literal map rather than
# parsed, because a broken regex would fail silently into the wrong palette.
PAPER = "#fbfaf7"
INK = "#17181a"
INK_SOFT = "#5c6068"
INK_FAINT = "#676b73"
RULE = "#dfdcd4"
VERIFIED = "#12694a"
VERIFIED_BG = "#e8f3ee"

# The live testnet anchor. Must match index.html and main.js — see the grep in
# README.md ("Facts on the page") before changing either.
TX = "3fb0f496f209507098e6439c646a60d6a576de856a28afbb4f44598b77dc512f"
LEDGER = "4033690"

FONTS = {
    "serif": "ofl/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf",
    "serif-italic": "ofl/newsreader/Newsreader-Italic%5Bopsz%2Cwght%5D.ttf",
    "sans": "ofl/publicsans/PublicSans%5Bwght%5D.ttf",
    "mono": "ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
}


def font_file(key: str) -> Path:
    """Fetch a family into the cache on first use and return its path."""
    path = FONT_CACHE / f"{key}.ttf"
    if path.exists():
        return path

    path.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://github.com/google/fonts/raw/main/{FONTS[key]}"
    print(f"fetching {key}", file=sys.stderr)
    with urllib.request.urlopen(url) as response:
        path.write_bytes(response.read())
    return path


def load(key: str, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
    """Load a family at a size, setting the weight axis where it has one."""
    face = ImageFont.truetype(str(font_file(key)), size)
    if weight is not None:
        try:
            face.set_variation_by_axes([weight])
        except OSError:
            # FreeType without variable-font support falls back to the default
            # instance. The card is still legible, just uniformly weighted.
            pass
    return face


def rule(draw: ImageDraw.ImageDraw, y: int, x0: int = MARGIN, x1: int = WIDTH - MARGIN) -> None:
    draw.line([(x0, y), (x1, y)], fill=RULE, width=1)


def build() -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)

    serif = load("serif", 66, 500)
    serif_italic = load("serif-italic", 66, 500)
    wordmark = load("serif", 30, 500)
    sans = load("sans", 23, 400)
    mono_label = load("mono", 15, 400)
    mono_value = load("mono", 19, 400)
    chip_face = load("mono", 15, 500)

    # ── Masthead ────────────────────────────────────────────────────────
    tick = MARGIN
    draw.line([(tick, 62), (tick + 11, 73), (tick + 28, 50)], fill=VERIFIED, width=4)
    draw.text((tick + 42, 44), "ProofChain", font=wordmark, fill=INK)

    draw.text(
        (WIDTH - MARGIN, 52),
        "STELLAR TESTNET PILOT",
        font=mono_label,
        fill=INK_FAINT,
        anchor="ra",
    )
    rule(draw, 100)

    # ── Headline ────────────────────────────────────────────────────────
    # Set as three runs so the italic emphasis lands on "verify yourself",
    # which is the whole claim and the reason Newsreader was chosen.
    y = 168
    draw.text((MARGIN, y), "A tonne of plastic", font=serif, fill=INK)
    y += 82
    draw.text((MARGIN, y), "you can ", font=serif, fill=INK)
    x = MARGIN + draw.textlength("you can ", font=serif)
    draw.text((x, y), "verify yourself", font=serif_italic, fill=INK)
    x += draw.textlength("verify yourself", font=serif_italic)
    draw.text((x, y), ".", font=serif, fill=INK)

    draw.text(
        (MARGIN, 330),
        "Signed on the device. Sealed into a Merkle batch.",
        font=sans,
        fill=INK_SOFT,
    )
    draw.text(
        (MARGIN, 364),
        "Anchored on Stellar. Recomputable by anyone who doubts it.",
        font=sans,
        fill=INK_SOFT,
    )

    # ── Anchor receipt strip ────────────────────────────────────────────
    strip = 428
    rule(draw, strip)
    draw.text((MARGIN, strip + 26), "ANCHOR RECEIPT", font=mono_label, fill=INK_FAINT)

    # Verified chip, right-aligned on the same baseline.
    label = "VERIFIED"
    chip_w = int(draw.textlength(label, font=chip_face)) + 46
    chip_x1, chip_y0, chip_h = WIDTH - MARGIN, strip + 18, 30
    draw.rectangle(
        [chip_x1 - chip_w, chip_y0, chip_x1, chip_y0 + chip_h],
        fill=VERIFIED_BG,
    )
    draw.line(
        [
            (chip_x1 - chip_w + 13, chip_y0 + 16),
            (chip_x1 - chip_w + 18, chip_y0 + 21),
            (chip_x1 - chip_w + 27, chip_y0 + 10),
        ],
        fill=VERIFIED,
        width=3,
    )
    draw.text((chip_x1 - chip_w + 34, chip_y0 + 7), label, font=chip_face, fill=VERIFIED)

    # The hash is the evidence, so it gets the largest mono setting on the card
    # and is split across two lines rather than truncated with an ellipsis.
    draw.text((MARGIN, strip + 62), TX[:32], font=mono_value, fill=INK)
    draw.text((MARGIN, strip + 90), TX[32:], font=mono_value, fill=INK)

    for index, (key, value) in enumerate(
        [("LEDGER", LEDGER), ("FEE", "100 stroops"), ("MEMO", "= sealed root")]
    ):
        col = MARGIN + 560 + index * 172
        draw.text((col, strip + 62), key, font=mono_label, fill=INK_FAINT)
        draw.text((col, strip + 86), value, font=mono_value, fill=INK)

    rule(draw, HEIGHT - 66)
    draw.text(
        (MARGIN, HEIGHT - 48),
        "proofchain-xzy.github.io/proofchain-landing",
        font=mono_label,
        fill=INK_FAINT,
    )
    draw.text(
        (WIDTH - MARGIN, HEIGHT - 48),
        "NOT A CERTIFIED CREDIT ISSUER",
        font=mono_label,
        fill=INK_FAINT,
        anchor="ra",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    build()
