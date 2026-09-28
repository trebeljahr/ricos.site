"""Cuts the 404 picture off its paper, into the two files the page stamps.

    python3 src/scripts/dev/make404Cutout.py

Reads src/content/Notes/assets/blog/404.jpg — a pipe painted on cream, with a
flat border colour on all four corners — and writes:

    public/not-found/pipe.png     the pipe, in the browns it was painted in
    public/not-found/words.png    the handwriting, as a shape to stamp ink
                                  through, because the grey it was written in
                                  disappears against a dark page

A pixel's alpha is how far its colour stands from that border colour, not how
dark it is: the pipe's highlights are lighter than the paper, and keying on
darkness made them vanish.

The two halves need different handling, which is why they are built
separately rather than cut from one mask:

  the pipe   is a solid shape with a soft edge. Its outermost pixel is JPEG
             ringing rather than paint — lighter than the paper, so it counts
             as something, and against a dark page it reads as a pale rim —
             so the shape loses a pixel all round. What is left of the soft
             edge takes the paint's own colour, carried outward from the
             pixels solid enough to work it out from; dividing the paper back
             out of a mostly-paper pixel is what turned that edge white.

  the words  are hairlines. Taking a pixel off them takes most of them, so
             they keep every pixel they have, and they start counting as ink
             sooner, which holds the thin strokes together. Counting sooner
             lets the paper's own texture in as well, so anything too small
             to survive being eaten a pixel and grown back is dropped: a
             stroke lives through that, a speck does not.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "src/content/Notes/assets/blog/404.jpg"
OUT = ROOT / "public/not-found"

# The rows the pipe gives way to the handwriting, and where the handwriting
# ends: below that is the painter's signature, which is not part of the joke.
SPLIT = 440
SIGNATURE = 535
# Where paint starts and where it is paint through and through, as a distance
# from the border colour. The words start sooner, so their strokes stay whole.
PIPE_FLOOR, PIPE_CEIL = 19.0, 58.0
WORDS_FLOOR, WORDS_CEIL = 11.0, 40.0
# Above this much paint, the colour under it can be worked out safely.
TRUST = 0.75


def alpha_of(src, border, floor, ceil):
    return np.clip((np.linalg.norm(src - border, axis=2) - floor) / (ceil - floor), 0.0, 1.0)


def despeckled(alpha, level=0.25):
    """Without the specks: what cannot be eaten a pixel and grown back."""
    solid = (alpha > level).astype(np.float64)
    eaten = solid.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            eaten = np.minimum(eaten, np.roll(np.roll(solid, dy, 0), dx, 1))
    grown = eaten.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            grown = np.maximum(grown, np.roll(np.roll(eaten, dy, 0), dx, 1))
    return alpha * grown


def shrunk(alpha):
    """A pixel off every edge, which is where the ringing sits."""
    out = alpha.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            out = np.minimum(out, np.roll(np.roll(alpha, dy, 0), dx, 1))
    return out


def unpainted(src, border, alpha):
    """The paint with the paper divided back out, and carried outward into the
    soft edge where there is too little of it to divide anything out of."""
    height, width, _ = src.shape
    solid = alpha >= TRUST
    spread = alpha[..., None]
    colour = np.where(solid[..., None], (src - (1 - spread) * border) / np.maximum(spread, 1e-6), np.nan)
    known = solid.copy()
    for _ in range(24):
        if known.all():
            break
        filled = np.zeros_like(colour)
        counts = np.zeros((height, width))
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            filled += np.roll(np.roll(np.where(known[..., None], colour, 0.0), dy, 0), dx, 1)
            counts += np.roll(np.roll(known.astype(float), dy, 0), dx, 1)
        fresh = (~known) & (counts > 0) & (alpha > 0)
        colour[fresh] = filled[fresh] / counts[fresh][..., None]
        known |= fresh
    return np.clip(np.nan_to_num(colour, nan=0.0), 0, 255)


def main():
    src = np.asarray(Image.open(SOURCE).convert("RGB")).astype(np.float64)
    height, width, _ = src.shape
    border = src[0, 0]
    above = np.zeros((height, width), bool)
    above[:SPLIT] = True
    handwriting = np.zeros((height, width), bool)
    handwriting[SPLIT:SIGNATURE] = True

    pipe_alpha = shrunk(alpha_of(src, border, PIPE_FLOOR, PIPE_CEIL)) * above
    words_alpha = despeckled(alpha_of(src, border, WORDS_FLOOR, WORDS_CEIL)) * handwriting

    pipe = np.zeros((height, width, 4), np.uint8)
    pipe[..., :3] = unpainted(src, border, pipe_alpha).astype(np.uint8)
    pipe[..., 3] = (pipe_alpha * 255).astype(np.uint8)

    words = np.zeros((height, width, 4), np.uint8)
    words[..., 3] = (words_alpha * 255).astype(np.uint8)

    # Both are cropped to the same box, tight around everything either of
    # them holds. The painting has wide margins of bare paper, and once the
    # paper is gone those margins are empty space inside the picture's own
    # box: it lines up with the words beside it by its box, so the box has to
    # be the picture.
    ink = (pipe[..., 3] > 8) | (words[..., 3] > 8)
    rows = np.flatnonzero(ink.any(axis=1))
    cols = np.flatnonzero(ink.any(axis=0))
    margin = 6
    top, bottom = max(0, rows[0] - margin), min(height, rows[-1] + 1 + margin)
    left, right = max(0, cols[0] - margin), min(width, cols[-1] + 1 + margin)

    Image.fromarray(pipe[top:bottom, left:right], "RGBA").save(OUT / "pipe.png", optimize=True)
    Image.fromarray(words[top:bottom, left:right], "RGBA").save(OUT / "words.png", optimize=True)
    print(f"wrote {OUT/'pipe.png'} and {OUT/'words.png'} at {right-left}x{bottom-top}")


if __name__ == "__main__":
    main()
