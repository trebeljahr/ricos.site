/**
 * Turning a click on the spectrum's colour scale into a photograph.
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
 * The photo `along` of the way through `band`, where `along` is 0 at the
 * band's left edge and 1 at its right.
 *
 * Clicking two thirds of the way along Gold lands two thirds of the way
 * through the golds. Jumping to the band's first photo instead — which is what
 * this replaces — made a strip drawn to scale behave like eleven buttons
 * wearing a gradient, and the scale stopped meaning anything at the resolution
 * a reader was aiming at.
 *
 * `along` is mapped inside the band and nowhere else, which is what keeps it
 * honest against a strip whose segments carry a minimum width: the segments
 * are not proportional to each other any more, but each one is still exactly
 * its own band, so a fraction of a segment is that fraction of its band.
 *
 * The result never leaves the band. A click at the extreme right edge returns
 * the band's last photo rather than the first of the next one, because a
 * reader aiming at the end of the greens means the last green.
 */
export function photoAtFraction(band: ScaleBand, along: number): number {
  if (band.count <= 0) return band.index;
  const clamped = Math.min(1, Math.max(0, along));
  const offset = Math.min(band.count - 1, Math.floor(clamped * band.count));
  return band.index + offset;
}

/**
 * How far along an element a pointer event landed, 0 to 1.
 *
 * Returns 0 for a keyboard activation, where `detail` is 0 and there is no
 * position to read — the start of the band is the only sensible answer — and
 * for an element with no width, which is what a zero-size viewport reports.
 */
export function fractionAcross(
  box: { left: number; width: number },
  clientX: number,
  detail: number,
): number {
  if (detail === 0 || box.width === 0) return 0;
  return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
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
