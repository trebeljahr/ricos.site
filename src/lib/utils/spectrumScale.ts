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
