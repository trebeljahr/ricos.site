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
 *  blending still read as muddy at that chroma. Where this asks for more than
 *  the screen can show, `intoGamut` takes it back down. */
export const STRIP_CHROMA_BOOST = 1.2;

/** Stops per half of a seam. The browser draws straight lines between stops,
 *  and each corner where one line meets the next is a change of slope the eye
 *  picks out as a faint stripe. Eight keeps those corners too small to see
 *  along the eased hue arc they approximate. */
const SEAM_STEPS = 8;

/** The screens a gradient can be built for. */
export type Gamut = "srgb" | "p3";

/** A swatch as the strip paints it: chroma boosted as far as the screen can
 *  show, and a neutral's chroma set to zero so that its noisy hue cannot pull
 *  a blend towards it.
 *
 *  Brought into gamut here, before any blending, and not only stop by stop
 *  afterwards. The boost asks for more than sRGB holds at most swatches, and
 *  the edge of the gamut sits further out between some neighbours than at
 *  either of them: red and orange are both cut back, the scarlet between them
 *  is not. Blending the boosted colours and cutting each stop back after put a
 *  bright line at those seams, more saturated than the bands either side. */
function stripColour(hex: string, gamut: Gamut): Oklch | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const colour = rgbToOklch(rgb.r, rgb.g, rgb.b);
  if (colour.c < NEUTRAL_CHROMA) return { l: colour.l, c: 0, h: colour.h };
  return intoGamut({ ...colour, c: colour.c * STRIP_CHROMA_BOOST }, gamut);
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

/** Linear-light RGB channels of an OKLCh colour, in sRGB primaries or in
 *  Display P3's. Inside the gamut every channel is between 0 and 1. */
function linearRgb({ l, c, h }: Oklch, gamut: Gamut): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ];
  const r = 4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2];
  const g = -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2];
  const bl = -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2];
  if (gamut === "srgb") return [r, g, bl];
  return [
    0.8224621 * r + 0.177538 * g,
    0.0331941 * r + 0.9668058 * g,
    0.0170827 * r + 0.0723974 * g + 0.9105199 * bl,
  ];
}

/** Room for the rounding in `oklchCss`, so a colour `intoGamut` put on the
 *  edge of the gamut does not count as outside it once written out. */
const GAMUT_EPSILON = 1e-4;

export function inGamut(colour: Oklch, gamut: Gamut, tolerance = GAMUT_EPSILON): boolean {
  return linearRgb(colour, gamut).every(
    (channel) => channel >= -tolerance && channel <= 1 + tolerance,
  );
}

/** The colour with its chroma lowered until the screen can show it, lightness
 *  and hue kept.
 *
 *  Needed because the boosted blends run well outside sRGB from red through to
 *  blue, and the browser brings those back in by clamping each channel on its
 *  own. A channel that starts clamping partway along a ramp stops changing
 *  there while the others carry on, and each of those corners showed as a
 *  band. Lowering chroma keeps the ramp smooth. */
export function intoGamut(colour: Oklch, gamut: Gamut): Oklch {
  if (inGamut(colour, gamut, 0)) return colour;
  let low = 0;
  let high = colour.c;
  for (let i = 0; i < 20; i++) {
    const middle = (low + high) / 2;
    if (inGamut({ ...colour, c: middle }, gamut, 0)) low = middle;
    else high = middle;
  }
  return { ...colour, c: low };
}

/** Smoothstep. A blend eased this way leaves each band's own colour with zero
 *  slope, so the colour lingers across the middle of its segment and reads at
 *  full strength, where a straight ramp only reached it for one pixel column.
 *
 *  Holding each colour flat across the middle was tried first and banded: the
 *  eye outlines a flat stretch between two ramps, so every band became a
 *  stripe. Easing gets the same fullness with no edge to outline. */
const ease = (u: number) => u * u * (3 - 2 * u);

/** Precise enough that rounding cannot carry a colour `intoGamut` left on the
 *  edge of the gamut back out of it, and chroma rounded down, towards grey,
 *  which is always further inside. */
function oklchCss({ l, c, h }: Oklch): string {
  const chroma = (Math.floor(c * 1e5) / 1e5).toFixed(5);
  return `oklch(${(l * 100).toFixed(3)}% ${chroma} ${h.toFixed(2)})`;
}

/** The gradient one segment of the scale is painted with, for a screen of the
 *  given gamut.
 *
 *  Each segment runs from the midpoint it shares with the band before it to
 *  the midpoint it shares with the band after, with its own colour at its
 *  centre. Neighbouring segments therefore meet at the same colour and the
 *  eleven blocks read as one ramp, without any segment having to know how wide
 *  the others ended up — which matters, because a minimum width means they are
 *  not proportional and CSS cannot be told where the seams fall.
 *
 *  A blend runs from one centre to the next along the eased curve, half of it
 *  in each segment. The stops are `oklch()` colours worked out here
 *  along the hue arc, rather than two endpoints and `in oklch` for the browser
 *  to blend. Chrome drops the hue of a zero-chroma stop in an `in oklch`
 *  gradient and blends pink into white through pale blue. Gradients with
 *  `oklch()` stops blend in OKLab by default, which has no hue to lose.
 *
 *  The ends of the strip hold their own colour rather than fading out of
 *  nothing. A fill that is not a hex colour, which `COLOR_BUCKETS` never holds,
 *  is returned as it is. */
export function segmentGradient(
  fill: string,
  previous: string | null,
  next: string | null,
  gamut: Gamut = "srgb",
): string {
  const own = stripColour(fill, gamut);
  if (!own) return fill;
  const before = previous ? stripColour(previous, gamut) : null;
  const after = next ? stripColour(next, gamut) : null;
  const stop = (colour: Oklch, at: number) => `${oklchCss(intoGamut(colour, gamut))} ${at}%`;

  const stops: string[] = [];
  if (before) {
    // The second half of the blend from `before`: from the shared midpoint
    // up to, not including, this colour.
    for (let k = 0; k < SEAM_STEPS; k++) {
      const u = 0.5 + (0.5 * k) / SEAM_STEPS;
      stops.push(stop(mixOklch(before, own, ease(u)), (50 * k) / SEAM_STEPS));
    }
  } else stops.push(stop(own, 0));
  stops.push(stop(own, 50));
  if (after) {
    for (let k = 1; k <= SEAM_STEPS; k++) {
      const u = (0.5 * k) / SEAM_STEPS;
      stops.push(stop(mixOklch(own, after, ease(u)), 50 + (50 * k) / SEAM_STEPS));
    }
  } else stops.push(stop(own, 100));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
