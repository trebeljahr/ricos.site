/**
 * Turning a point on the spectrum's colour scale into a place in the sweep,
 * and back.
 *
 * Lives here rather than inline in the handler because it is the part that can
 * be wrong quietly. The strip is the only navigation on that page, and the two
 * bugs before this one were both a position computed one way and drawn
 * another — arithmetic that looked right and landed in the wrong place. This
 * is the arithmetic, on its own, with a test.
 */

export type ScaleBand = {
  /** Index of the band's first photo in the sweep. */
  index: number;
  /** How many photos the band holds. */
  count: number;
};

/**
 * The position in the sweep `along` of the way through `band`, where `along`
 * is 0 at the band's left edge and 1 at its right. A position is a photo's
 * index plus how far past it, so 12.5 is halfway through photo 12.
 *
 * Pressing two thirds of the way along Gold lands two thirds of the way
 * through the golds. Continuous rather than a whole photo, because the scale
 * is dragged as well as pressed: a drag that moved a photo at a time would
 * step the page a row at a time too.
 *
 * `along` is mapped inside the band and nowhere else, which is what keeps it
 * honest against a strip whose segments carry a minimum width: the segments
 * are not proportional to each other any more, but each one is still exactly
 * its own band, so a fraction of a segment is that fraction of its band.
 */
export function positionInBand(band: ScaleBand, along: number): number {
  return band.index + Math.min(1, Math.max(0, along)) * Math.max(0, band.count);
}

/**
 * How far along `band` a position sits, 0 to 1 — the inverse of
 * `positionInBand`, for drawing the marker where a drag put the page.
 */
export function alongBand(band: ScaleBand, position: number): number {
  if (band.count <= 0) return 0;
  return Math.min(1, Math.max(0, (position - band.index) / band.count));
}

/**
 * Index of the band holding `position`: the first whose stretch ends past it,
 * or the last band for a position at or beyond the end of the sweep. A
 * position exactly on a boundary belongs to the band starting there, which is
 * the same point on the strip either way — the segments touch.
 */
export function bandAt(bands: readonly ScaleBand[], position: number): number {
  for (let i = 0; i < bands.length; i++) {
    if (position < bands[i].index + bands[i].count) return i;
  }
  return bands.length - 1;
}

/** Blend two `#rrggbb` colours in sRGB, `t` of the way from `a` to `b`.
 *
 *  For the scale's gradient. sRGB rather than a perceptual space on purpose:
 *  the stops are a few per cent apart, where the difference between blending
 *  models is invisible, and a colour the strip shows has to be exactly the
 *  swatch its band was measured to have — converting out and back would move
 *  it by a rounding error for no benefit anyone can see.
 *
 *  Returns `a` unchanged if either input is not a six-digit hex, which is the
 *  only shape `COLOR_BUCKETS` holds. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) =>
    /^#[0-9a-f]{6}$/i.test(hex)
      ? [
          Number.parseInt(hex.slice(1, 3), 16),
          Number.parseInt(hex.slice(3, 5), 16),
          Number.parseInt(hex.slice(5, 7), 16),
        ]
      : null;
  const from = parse(a);
  const to = parse(b);
  if (!from || !to) return a;
  const at = Math.min(1, Math.max(0, t));
  const channel = (i: number) =>
    Math.round(from[i] + (to[i] - from[i]) * at)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/** The gradient one segment of the scale is painted with.
 *
 *  Each segment runs from the midpoint it shares with the band before it to
 *  the midpoint it shares with the band after, holding its own colour across
 *  the middle. Neighbouring segments therefore meet at the same colour and the
 *  eleven blocks read as one ramp, without any segment having to know how wide
 *  the others ended up — which matters, because a minimum width means they are
 *  not proportional and CSS cannot be told where the seams fall.
 *
 *  The ends of the strip hold their own colour rather than fading out of
 *  nothing. */
export function segmentGradient(
  fill: string,
  previous: string | null,
  next: string | null,
): string {
  const from = previous ? mixHex(previous, fill, 0.5) : fill;
  const to = next ? mixHex(fill, next, 0.5) : fill;
  return `linear-gradient(to right, ${from}, ${fill} 50%, ${to})`;
}
