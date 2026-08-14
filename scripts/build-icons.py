#!/usr/bin/env python3
"""
Render the app icons into assets/.

    python3 -m pip install pillow
    python3 scripts/build-icons.py

The mark is the same square-capped tick used in the masthead and the footer
wordmark, drawn in --verified on --paper. Drawn here rather than exported from
a design tool so the geometry stays tied to the SVG path in index.html.

Sizes:
  icon-192.png / icon-512.png  standard PWA icons, referenced by the manifest
  icon-maskable-512.png        heavier padding so Android's mask cannot clip
                               the tick; the safe zone is the middle 80%
  apple-touch-icon.png         180px, opaque — iOS composites no transparency
                               and squares off the corners itself
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"

PAPER = "#fbfaf7"
VERIFIED = "#12694a"

# The masthead path is "M4 12.5 9.5 18 20 6.5" on a 24x24 viewBox, expressed
# here as fractions of the icon box so it scales to any size.
TICK = [(4 / 24, 12.5 / 24), (9.5 / 24, 18 / 24), (20 / 24, 6.5 / 24)]
STROKE_RATIO = 2.2 / 24


def render(size: int, inset: float) -> Image.Image:
    """Draw the tick at `size` px, with `inset` of the box left clear around it."""
    # Supersample and downscale: PIL has no antialiased line drawing, and at
    # 192px a hard-edged diagonal is visibly stepped.
    scale = 4
    box = size * scale
    image = Image.new("RGB", (box, box), PAPER)
    draw = ImageDraw.Draw(image)

    span = box * (1 - 2 * inset)
    origin = box * inset
    points = [(origin + x * span, origin + y * span) for x, y in TICK]
    width = max(1, round(box * STROKE_RATIO * (1 - 2 * inset)))

    # PIL joins polyline segments with a notch at the vertex, so the elbow of
    # the tick is filled in by hand. Only the middle point — filling the two
    # ends as well would round the caps, and the masthead path is square-capped.
    draw.line(points, fill=VERIFIED, width=width)
    ex, ey = points[1]
    r = width / 2
    draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=VERIFIED)

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = [
        ("icon-192.png", 192, 0.20),
        ("icon-512.png", 512, 0.20),
        # Android may crop to a circle inscribed in the middle 80%.
        ("icon-maskable-512.png", 512, 0.30),
        ("apple-touch-icon.png", 180, 0.20),
    ]
    for name, size, inset in targets:
        path = OUT / name
        render(size, inset).save(path, optimize=True)
        print(f"wrote assets/{name} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
