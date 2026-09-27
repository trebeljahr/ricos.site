"""
Renders the easter egg sprites into public/sprites.

Every emoji listed in src/lib/sprites.ts is drawn from the Apple Color Emoji
font at its largest size (160 px), so the eggs look the same on every
platform. The painted Easter eggs start from the plain egg emoji: a pattern is
multiplied onto it, so the shell keeps Apple's light and shadow.

Needs macOS (for the font) and Pillow:
    python3 -m pip install pillow
    python3 src/scripts/sprites/renderSprites.py

Files that are no longer listed are deleted.
"""

import math
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[3]
REGISTRY = ROOT / "src/lib/sprites.ts"
OUT = ROOT / "public/sprites"
FONT = "/System/Library/Fonts/Apple Color Emoji.ttc"
SIZE = 160  # The largest bitmap in the font; any other size is a blurry rescale.
SUPERSAMPLE = 4
WEBP = {"quality": 90, "method": 6}

font = ImageFont.truetype(FONT, SIZE)


def listed(name: str) -> list[str]:
    source = REGISTRY.read_text()
    match = re.search(rf"export const {name} = \[(.*?)\] as const", source, re.S)
    if not match:
        raise SystemExit(f"{name} not found in {REGISTRY}")
    return re.findall(r'"([^"]+)"', match.group(1))


def file_name(emoji: str) -> str:
    """Same rule as spriteSrc in src/lib/sprites.ts."""
    return "-".join(f"{ord(c):x}" for c in emoji if ord(c) != 0xFE0F)


def render(emoji: str) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(image).text((0, 0), emoji, font=font, embedded_color=True)
    if image.getbbox() is None:
        raise SystemExit(f"{emoji!r} rendered empty: is it in Apple Color Emoji?")
    return image


# --- Painted Easter eggs -----------------------------------------------------

WHITE = (255, 255, 255)
PINK = (255, 130, 180)
YELLOW = (255, 214, 60)
BLUE = (90, 180, 255)
GREEN = (80, 200, 130)
MINT = (120, 222, 160)
PURPLE = (180, 130, 255)

# Base colour, then bands from top to bottom: (kind, centre y in px, size, colour, *extras).
DESIGNS = {
    "easter-egg-pink": ((255, 140, 190), [
        ("dots", 34, 4.4, WHITE, 4),
        ("band", 58, 7, YELLOW),
        ("zigzag", 82, 12, BLUE),
        ("band", 106, 7, YELLOW),
        ("dots", 128, 4.4, WHITE, 4),
    ]),
    "easter-egg-blue": ((110, 190, 255), [
        ("band", 40, 6, WHITE),
        ("wave", 70, 6, PINK),
        ("band", 96, 13, YELLOW),
        ("dots", 120, 4.2, WHITE, 5),
    ]),
    "easter-egg-yellow": ((255, 214, 70), [
        ("dots", 36, 4.4, PINK, 4),
        ("zigzag", 66, 12, GREEN),
        ("band", 92, 8, PINK),
        ("zigzag", 116, 10, BLUE),
    ]),
    "easter-egg-green": (MINT, [
        ("band", 44, 7, PURPLE),
        ("dots", 68, 4.6, WHITE, 5),
        ("band", 90, 13, PINK),
        ("wave", 116, 5, PURPLE),
    ]),
    # Green on top, blue below, split by a white zigzag: the footer egg.
    "easter-egg-green-blue": ((110, 210, 140), [
        ("dots", 36, 4.4, WHITE, 4),
        ("wave", 60, 5, (90, 170, 250)),
        ("band", 122, 76, (90, 170, 250)),
        ("zigzag", 86, 10, WHITE),
        ("dots", 118, 4.4, WHITE, 4),
    ]),
    "easter-egg-purple": ((185, 150, 255), [
        ("zigzag", 48, 10, YELLOW),
        ("band", 76, 7, WHITE),
        ("dots", 98, 4.6, YELLOW, 5),
        ("zigzag", 122, 10, MINT),
    ]),
}


class Pattern:
    """Bands drawn around the egg, bigger than needed and downscaled for smooth edges."""

    BEND = 9  # A band wrapped round the egg dips toward the sides.

    def __init__(self, egg_box, base):
        self.x0, _, self.x1, _ = egg_box
        self.cx = (self.x0 + self.x1) / 2
        self.half = (self.x1 - self.x0) / 2
        self.image = Image.new("RGB", (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), base)
        self.draw = ImageDraw.Draw(self.image)

    def y(self, centre, x):
        return centre + self.BEND * ((x - self.cx) / self.half) ** 2

    def xs(self, steps):
        left, right = self.x0 - 4, self.x1 + 4
        return [left + (right - left) * i / steps for i in range(steps + 1)]

    def scaled(self, points):
        return [(x * SUPERSAMPLE, y * SUPERSAMPLE) for x, y in points]

    def band(self, centre, height, colour):
        xs = self.xs(120)
        top = [(x, self.y(centre - height / 2, x)) for x in xs]
        bottom = [(x, self.y(centre + height / 2, x)) for x in reversed(xs)]
        self.draw.polygon(self.scaled(top + bottom), fill=colour)

    def zigzag(self, centre, height, colour, teeth=7):
        points = [
            (x, self.y(centre, x) + (height / 2 if i % 2 else -height / 2))
            for i, x in enumerate(self.xs(teeth * 2))
        ]
        self.draw.line(self.scaled(points), fill=colour, width=int(3.6 * SUPERSAMPLE), joint="curve")

    def wave(self, centre, amplitude, colour, waves=3):
        points = [
            (x, self.y(centre, x) + amplitude * math.sin((x - self.x0) / (self.x1 - self.x0) * waves * 2 * math.pi))
            for x in self.xs(240)
        ]
        self.draw.line(self.scaled(points), fill=colour, width=int(3.6 * SUPERSAMPLE), joint="curve")

    def dots(self, centre, radius, colour, count):
        for i in range(count):
            x = self.x0 + (self.x1 - self.x0) * (i + 0.5) / count
            y = self.y(centre, x)
            box = (x - radius, y - radius, x + radius, y + radius)
            self.draw.ellipse([v * SUPERSAMPLE for v in box], fill=colour)

    def result(self):
        return self.image.resize((SIZE, SIZE), Image.LANCZOS)


def paint(egg: Image.Image, base, parts) -> Image.Image:
    alpha = egg.getchannel("A")
    pattern = Pattern(alpha.getbbox(), base)
    for kind, *args in parts:
        getattr(pattern, kind)(*args)

    # The shell's own brightness, scaled so its light side is 1: multiplying keeps the shading.
    grey = egg.convert("RGB").convert("L")
    shell = sorted(g for g, a in zip(grey.tobytes(), alpha.tobytes()) if a > 250)
    light_side = shell[int(len(shell) * 0.97)]
    light = grey.point(lambda v: min(255, round(v * 255 / light_side)))
    painted = ImageChops.multiply(pattern.result(), Image.merge("RGB", [light] * 3))

    # A soft gloss where the shell is brightest.
    gloss = grey.filter(ImageFilter.GaussianBlur(4)).point(
        lambda v: max(0, min(110, round((v - light_side * 0.97) * 22)))
    )
    painted = ImageChops.screen(painted, Image.merge("RGB", [gloss] * 3))
    painted.putalpha(alpha)
    return painted


def save(image: Image.Image, name: str) -> str:
    path = OUT / f"{name}.webp"
    image.save(path, "WEBP", **WEBP)
    return path.name


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    written = {save(render(emoji), file_name(emoji)) for emoji in listed("EMOJI_SPRITES")}

    egg = render("🥚")
    for name in listed("EASTER_EGG_SPRITES"):
        if name not in DESIGNS:
            raise SystemExit(f"No design for {name}: add one to DESIGNS")
        base, parts = DESIGNS[name]
        written.add(save(paint(egg, base, parts), name))

    for stale in OUT.glob("*.webp"):
        if stale.name not in written:
            stale.unlink()
            print(f"removed {stale.name}")
    print(f"{len(written)} sprites in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
