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

import { parseHex, rgbToOklch } from "src/lib/colorBuckets.mjs";

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

/** A colour in OKLCh: lightness 0-1, chroma, hue in degrees. */
export type Oklch = { l: number; c: number; h: number };

/** Below this chroma a swatch counts as one of the neutrals, and the hue its
 *  conversion reports is noise. The neutral swatches measure under 0.01 and
 *  the palest chromatic one, purple, 0.12. */
const NEUTRAL_CHROMA = 0.02;

/** How much more colourful the strip is than the swatches it is drawn from.
 *  The swatches are already scaled up from the measured means so they read in
 *  a 24px circle, but a 28px-tall strip that spends most of its length
 *  blending still read as muddy at that chroma. Anything this pushes past
 *  sRGB the browser maps back into gamut, and a wide-gamut screen shows it. */
export const STRIP_CHROMA_BOOST = 1.2;

/** The middle of each segment, as percentages, painted flat in its own colour.
 *  The rest of it blends towards its neighbours. A strip that is all blend
 *  shows each colour at full strength for one pixel column, and the eye reads
 *  the rest as the in-between shades. */
const HOLD_FROM = 30;
const HOLD_TO = 70;

/** Stops per half of a seam. The hue arc between neighbours is followed in
 *  JS and the browser only draws straight lines between these stops, so four
 *  of them keep the in-between colours within a few degrees of the arc. */
const SEAM_STEPS = 4;

/** A swatch as the strip paints it: chroma boosted, and a neutral's chroma set
 *  to zero so that its noisy hue cannot pull a blend towards it. */
function stripColour(hex: string): Oklch | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const colour = rgbToOklch(rgb.r, rgb.g, rgb.b);
  if (colour.c < NEUTRAL_CHROMA) return { l: colour.l, c: 0, h: colour.h };
  return { ...colour, c: colour.c * STRIP_CHROMA_BOOST };
}

/** Blend two OKLCh colours, `t` of the way from `a` to `b`.
 *
 *  Walks the hue circle the short way round rather than cutting across it,
 *  which is what sRGB blending does: gold and green met at an olive brown
 *  and blue and purple at slate, because the straight line between two hues
 *  passes nearer grey than either.
 *
 *  A neutral (chroma 0) has no hue to walk towards, so a blend with one keeps
 *  the other colour's hue and only fades its chroma: pink pales into white
 *  instead of passing through orange or blue on the way. */
export function mixOklch(a: Oklch, b: Oklch, t: number): Oklch {
  const at = Math.min(1, Math.max(0, t));
  let h: number;
  if (a.c === 0) h = b.h;
  else if (b.c === 0) h = a.h;
  else {
    const turn = ((b.h - a.h + 540) % 360) - 180;
    h = (a.h + turn * at + 360) % 360;
  }
  return { l: a.l + (b.l - a.l) * at, c: a.c + (b.c - a.c) * at, h };
}

function oklchCss({ l, c, h }: Oklch): string {
  return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(1)})`;
}

/** The gradient one segment of the scale is painted with.
 *
 *  Each segment runs from the midpoint it shares with the band before it to
 *  the midpoint it shares with the band after, holding its own colour flat
 *  across the middle. Neighbouring segments therefore meet at the same colour
 *  and the eleven blocks read as one ramp, without any segment having to know
 *  how wide the others ended up — which matters, because a minimum width means
 *  they are not proportional and CSS cannot be told where the seams fall.
 *
 *  The stops are `oklch()` colours worked out here along the hue arc, rather
 *  than two endpoints and `in oklch` for the browser to blend. Chrome drops
 *  the hue of a zero-chroma stop in an `in oklch` gradient and blends pink
 *  into white through pale blue. Gradients with `oklch()` stops blend in
 *  OKLab by default, which has no hue to lose.
 *
 *  The ends of the strip hold their own colour rather than fading out of
 *  nothing. A fill that is not a hex colour, which `COLOR_BUCKETS` never holds,
 *  is returned as it is. */
export function segmentGradient(
  fill: string,
  previous: string | null,
  next: string | null,
): string {
  const own = stripColour(fill);
  if (!own) return fill;
  const before = previous ? stripColour(previous) : null;
  const after = next ? stripColour(next) : null;

  const stops: string[] = [];
  if (before) {
    // From the shared midpoint (t = 0.5) up to, not including, this colour.
    for (let k = 0; k < SEAM_STEPS; k++) {
      const colour = mixOklch(before, own, 0.5 + (0.5 * k) / SEAM_STEPS);
      stops.push(`${oklchCss(colour)} ${(HOLD_FROM * k) / SEAM_STEPS}%`);
    }
  }
  stops.push(`${oklchCss(own)} ${before ? HOLD_FROM : 0}%`);
  stops.push(`${oklchCss(own)} ${after ? HOLD_TO : 100}%`);
  if (after) {
    for (let k = 1; k <= SEAM_STEPS; k++) {
      const colour = mixOklch(own, after, (0.5 * k) / SEAM_STEPS);
      stops.push(`${oklchCss(colour)} ${HOLD_TO + ((100 - HOLD_TO) * k) / SEAM_STEPS}%`);
    }
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
