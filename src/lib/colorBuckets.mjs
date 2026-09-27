// Colour-family bucketing for "browse the photography by colour".
//
// Single source of truth shared between:
//   - src/scripts/photographyColors.ts (build time — decodes each original
//     at 64px, histograms its pixels, bakes buckets/strength/hue into
//     src/content/photography-colors.json)
//   - src/lib/photographyColors.ts (runtime — counts, filters and orders
//     using the same ids, and feeds /photography/colors and
//     /photography/spectrum)
//
// Lives as `.mjs` so the tsx bake script and Next's bundler both import it
// without a build step, and so the numbers below have exactly one home.
// JSDoc annotations give the TypeScript callers real types.
//
// WHY PIXELS AND NOT A SINGLE AVERAGE COLOUR
// ------------------------------------------
// A whole-image average is the wrong input for hue filtering: average a
// blue sky against a sandy beach and you land on a muddy warm grey, which
// belongs to no family anyone would click. A pixel histogram recovers the
// actual palette instead — the blue in a mid-Atlantic photo is a third of
// its pixels even when the mean is beige.
//
// WHY MEMBERSHIP AND STRENGTH ARE TWO DIFFERENT NUMBERS
// -----------------------------------------------------
// Membership answers "does this photo belong under the red swatch"; it is
// a prior-normalised, thresholded yes/no (see below). Strength answers
// "how much red is in it" and is the raw chroma-weighted fraction of the
// whole image — no prior, no threshold. They have to be separate because
// the prior is what makes membership comparable across families, and is
// exactly what makes it useless for ordering *within* one: dividing every
// red photo by the same 0.064 is a monotone transform, so it cannot
// reorder them, and the share-of-chromatic-vote denominator actively lies
// — a foggy morning whose only colour is one red jacket reads as 90% red
// by that measure while being a grey picture. Strength divides by total
// pixels, so the reddest photo is the one with the most red in it.
//
// WHY SCORES ARE NORMALISED AGAINST A CORPUS PRIOR
// ------------------------------------------------
// Raw share doesn't work either, and this corpus makes the point sharply.
// Measured over a 1,117-photo stratified sample on 2026-09-27, blue takes
// a mean 25.8% of the chromatic vote, green 18.5% and gold 18.7%, while
// teal takes 1.6% and pink 1.4%. Sky, sea and jungle are the background
// condition of a travel archive, not an event in it: rank by raw share and
// the blue and green swatches return half the collection while teal
// returns almost nothing, so the ring stops meaning anything beyond "was
// taken outdoors". Each family's share is therefore divided by that
// family's mean share across the corpus (`FAMILY_PRIOR`), so a bucket
// means "unusually X *for this archive*" — which is what someone clicking
// a swatch actually wants.
//
// WHAT DID NOT CARRY OVER FROM THE PAINTING CORPUS
// ------------------------------------------------
// This logic is ported from Collection of Beauty, which classifies
// public-domain oil painting. There the warm wedge dominates — skin, wood,
// varnish, aged canvas — and gold's prior is 0.339 against 0.187 here,
// while teal's is 0.017 against 0.016 and blue's 0.064 against 0.258.
// Photographs of the outdoors have close to the opposite bias: the cool
// half of the circle is the common case and a whole-canvas warm cast does
// not exist, because nothing has varnished the sky.
//
// So the colour-space maths, the hue wedges and the membership/strength
// split are unchanged — they are corpus-independent — and every threshold
// fitted to varnish was re-measured here. Three moved (the two chromatic-
// fraction gates and the white band), one moved for a reason opposite to
// the one expected (the earth split, see BROWN_MAX_CHROMA), and the rest
// were left alone because the sweep showed no reason to touch them. Each
// one says below what it was measured against.

/**
 * @typedef {"red"|"orange"|"gold"|"brown"|"green"|"teal"|"blue"|"purple"|"pink"|"white"|"grey"|"black"} ColorBucketId
 */

/**
 * @typedef {object} ColorBucket
 * @property {ColorBucketId} id      Stable id — baked into JSON, used as the route segment.
 * @property {string} label          Human label for the wheel and the page heading.
 * @property {string} swatch         CSS colour for the swatch itself.
 * @property {boolean} neutral       True for the achromatic bands (white/grey/black).
 */

/** Ring order: the chromatic families walk the hue circle the way a
 *  painter's colour wheel does, brown sits among the earths it belongs
 *  to, and the three neutral bands close the ring.
 *
 *  Each chromatic swatch carries this corpus's measured hue for that
 *  family — the chroma-weighted circular mean of every pixel that voted
 *  for it across the 1,117-photo sample: red 22.0°, orange 51.6°, gold
 *  83.1°, brown 72.4°, green 128.9°, teal 196.3°, blue 248.6°, purple
 *  291.0°, pink 347.8°. That is why green is a leaf green at 129° rather
 *  than a web #00ff00 at 142°, and why the archive's red sits nearer
 *  terracotta than fire engine.
 *
 *  Lightness is the measured mean too, but chroma is the measured mean
 *  scaled up — by 1.6x where sRGB allows it and by as little as 1.3x where
 *  the gamut runs out first (teal at 196° and green at 129° do, at these
 *  lightnesses). That is a deliberate departure from the data: the measured
 *  mean chroma of a family here is 0.065-0.103, and twelve swatches at that
 *  chroma are muddy enough that red, brown and orange are not tellable
 *  apart in a 24px circle. The ring is a control, so it has to be legible;
 *  the hue it promises is still the hue the bucket contains.
 *
 *  Earth is the exception to the scaling: its swatch is held at chroma
 *  0.089, just inside BROWN_MAX_CHROMA, because the earth split is defined
 *  by that ceiling. Scale it up like the rest and `bucketForHex` classifies
 *  the Earth swatch as gold — a chooser whose swatch is not a member of the
 *  bucket it opens. The test suite asserts that invariant for all nine
 *  chromatic families.
 *
 *  The three neutral swatches are not measured. The mean lightness of the
 *  32 photos in the white band is 0.758, and a 0.76-lightness grey painted
 *  on a swatch labelled "White" just looks like a mistake, so these are the
 *  conventional near-white, mid-grey and near-black instead.
 *  @type {readonly ColorBucket[]} */
export const COLOR_BUCKETS = [
  { id: "red", label: "Red", swatch: "#a2202c", neutral: false },
  { id: "orange", label: "Orange", swatch: "#d06816", neutral: false },
  { id: "gold", label: "Gold", swatch: "#ca9200", neutral: false },
  { id: "brown", label: "Earth", swatch: "#714a0c", neutral: false },
  { id: "green", label: "Green", swatch: "#477400", neutral: false },
  { id: "teal", label: "Teal", swatch: "#009194", neutral: false },
  { id: "blue", label: "Blue", swatch: "#1482d5", neutral: false },
  { id: "purple", label: "Purple", swatch: "#6e5dae", neutral: false },
  { id: "pink", label: "Pink", swatch: "#bc5c91", neutral: false },
  { id: "white", label: "White", swatch: "#ece9e4", neutral: true },
  { id: "grey", label: "Grey", swatch: "#8b8a88", neutral: true },
  { id: "black", label: "Black", swatch: "#2c2b29", neutral: true },
];

/** @type {Set<string>} */
const BUCKET_IDS = new Set(COLOR_BUCKETS.map((b) => b.id));

/** Narrowing guard for anything arriving from a route param or JSON.
 *  @param {unknown} value
 *  @returns {value is ColorBucketId} */
export function isColorBucketId(value) {
  return typeof value === "string" && BUCKET_IDS.has(value);
}

/** @param {ColorBucketId} id @returns {ColorBucket} */
export function getColorBucket(id) {
  const found = COLOR_BUCKETS.find((b) => b.id === id);
  if (!found) throw new Error(`unknown colour bucket: ${id}`);
  return found;
}

// --- tuning constants -------------------------------------------------
// Every threshold below was checked against this corpus on 2026-09-27 by
// decoding all 4,900 photographs at 64px, keeping their histograms, and
// sweeping each constant over the whole set — so the counts quoted in the
// comments are counts of real photographs, not estimates. They're exported
// so the tests assert against the same numbers the bake script uses, and
// so a future re-tune has one place to change.

/** OKLCh chroma below which a pixel counts as achromatic. Below this, hue
 *  angle is numerically unstable and perceptually absent anyway. Kept at
 *  the painting-corpus value: this is a property of the colour space and
 *  of human vision rather than of the subject matter. */
export const CHROMA_FLOOR = 0.045;

/** Chroma at which a pixel casts a full-weight vote. Vivid pixels should
 *  outvote barely-tinted ones — one saturated sari says more about "what
 *  colour is this photo" than a wide expanse of hazy near-grey sky. Votes
 *  ramp linearly and clamp here, so a vivid pixel counts for about 2.5x a
 *  just-above-floor one. */
export const CHROMA_FULL_WEIGHT = 0.12;

/** Below this fraction of chromatic pixels a photo is called achromatic
 *  and gets only a white/grey/black band.
 *
 *  Lowered from the 0.07 that a corpus of engravings and grisaille wants.
 *  Across all 4,900 photos the chromatic fraction has a median of 0.429,
 *  and the bottom tail is short: 133 photos sit under 0.02 and 154 under
 *  0.03, but 285 under 0.07. Reading the 0.03-0.07 band shows the old
 *  threshold was doing two jobs at once — genuinely colourless frames
 *  (night, whiteout snow, long-exposure water) are under 0.02, while
 *  0.03-0.07 is overcast sea and haze that still reads faintly but
 *  unmistakably blue. Calling those "grey" throws away the one thing a
 *  viewer would say about them, so the gate sits at 0.03 and 154 photos
 *  (3.1%) are treated as having no hue. */
export const NEUTRAL_MAX_CHROMATIC_FRACTION = 0.03;

/** Photos under this chromatic fraction get their neutral band appended
 *  *alongside* their hue families — a misty tea-plantation frame is
 *  legitimately both "green" and "white" to someone browsing by colour.
 *
 *  Also lowered, from the 0.16 fitted to sepia prints, and for the same
 *  reason: 0.16 tags 691 photos (14.1%) with a neutral band, most of them
 *  ordinary hazy landscapes nobody would call grey. 0.08 tags 313 (6.4%),
 *  which is close to the set that really reads as "mostly colourless with
 *  a tint". */
export const MUTED_MAX_CHROMATIC_FRACTION = 0.08;

/** A family needs this raw share of the chromatic vote before it is even
 *  considered. Without it, prior normalisation lets a few stray pixels of
 *  a rare family (pink's prior here is 0.014) score arbitrarily high.
 *
 *  Unchanged: this is the constant that decides how much of a colour has
 *  to be present before the photo counts as carrying it, and the sweep
 *  behaves exactly as it should on either side. At 0.10 the rare families
 *  swell on slivers (red 554 -> 654, teal 154 -> 188, pink 105 -> 143); at
 *  0.16 they starve (red 459, teal 121, pink 82). 0.13 is the value that
 *  keeps a family's weakest members recognisable while still filling it. */
export const MIN_FAMILY_SHARE = 0.13;

/** Floor applied to the prior before dividing, so the rarest families
 *  cannot receive unbounded amplification.
 *
 *  Unchanged, and worth recording that it is inert here: sweeping it over
 *  0.03, 0.04 and 0.05 moved exactly zero photos in any family. Teal
 *  (0.016), purple (0.023) and pink (0.014) are the only priors below the
 *  floor, and MIN_FAMILY_SHARE already stops them qualifying on slivers —
 *  a 13% share of teal scores 4.3 at a 0.03 floor and 2.6 at 0.05, both
 *  far above MIN_FAMILY_SCORE, so the floor never decides anything. It
 *  stays as a guard against a future corpus where some family is rarer
 *  still, not because it is doing work today. */
export const MIN_PRIOR = 0.03;

/** Prior-normalised score a family must clear to be listed. 1.0 would
 *  mean "at least corpus-typical"; 1.2 asks for a visible margin above
 *  typical, which is what keeps blue and green from tagging every outdoor
 *  photo.
 *
 *  Unchanged. Raising it only shaves the largest family — the sweep gives
 *  a top family of 35.2% of the corpus at 1.2, 34.1% at 1.35 and 32.8% at
 *  1.5 — while leaving teal, purple and pink untouched at every setting,
 *  because those never qualify marginally. 1.2 already keeps the biggest
 *  family inside the 35% the browse pages were designed around, so there
 *  is nothing here the measurement asks to change. */
export const MIN_FAMILY_SCORE = 1.2;

/** Hard cap on families per photo, so the filter stays discriminating. */
export const MAX_FAMILIES = 3;

/** Weighted-mean OKLCh lightness bounds for the neutral bands.
 *
 *  WHITE_MIN_LIGHTNESS had to come down from 0.8, which is simply out of
 *  reach for a photograph: the 99th percentile of mean lightness across
 *  all 4,900 is 0.774, and only 8 photos in the whole archive sat above
 *  0.8 — a "White" swatch leading to eight pictures is a dead end. At 0.7
 *  it leads to 32, which is brighter than 95% of the archive (p95 = 0.697)
 *  and is the set of high-key whiteout, fog and snow frames a person would
 *  point at. BLACK_MAX_LIGHTNESS stays at 0.36, which is the 8.6th
 *  percentile here and catches 60 photos: night, silhouette and interior
 *  frames, and no more. */
export const WHITE_MIN_LIGHTNESS = 0.7;
export const BLACK_MAX_LIGHTNESS = 0.36;

/** Warm pixels both darker *and* duller than these bounds are earths, not
 *  oranges or golds.
 *
 *  The expectation going in was that this split would need tightening:
 *  this corpus's warm wedge is sunset, sari, spice and desert, and none of
 *  that should collapse to Earth. The measurement says the opposite, so
 *  the chroma ceiling was loosened from 0.08 to 0.09 instead.
 *
 *  Tightening it destroys the family rather than purifying it. At
 *  l<=0.48, c<=0.06 brown holds 258 photos, but the *strongest* of them
 *  carries only 0.159 brown and the median member 0.041 — the pixels that
 *  make something look brown in daylight (mud, dry earth, sandstone, wet
 *  wood) sit at chroma 0.06-0.09, so tightening evicts the subject matter
 *  and leaves a bucket that qualifies on noise amplified by a tiny prior.
 *  Its top three members are a sparkler, a bright corridor and a backlit
 *  dandelion. Loosening to c<=0.09 gives 1,478 photos whose strongest
 *  carries 0.419 and whose median carries 0.078, and whose top members are
 *  a banyan on an unpaved road and sandstone fort passages — which is what
 *  the label promises. The cost is 77 photos of orange membership
 *  (994 -> 917), and the sunsets stay in orange because sunset pixels are
 *  far above 0.09.
 *
 *  The lightness ceiling stays at 0.55. Raising it to 0.60 moves 302 more
 *  photos into Earth, and reading them shows what they are: hazy beaches,
 *  gilded shopfronts and long-exposure golden light, which belong to gold
 *  and orange. Lowering it to 0.52 costs 247 photos of Earth and gains
 *  nothing — the strongest member barely moves (0.412 against 0.419) and
 *  the gold and orange counts only drift. Earth is still this archive's
 *  least coherent family — see the report in src/lib/photographyColors.ts. */
export const BROWN_MAX_LIGHTNESS = 0.55;
export const BROWN_MAX_CHROMA = 0.09;

/** The mirror of the earth rule at the other end of the red arc: a red
 *  that is pale and soft is pink, not red. Hue alone can't separate the
 *  two — pale pink sits at 7° and crimson at 20°, well inside the same
 *  arc — so lightness and chroma do the work, exactly as they do for
 *  earths.
 *
 *  Unchanged: the sweep moves pink by ten photos either way (115 at
 *  l>=0.72/c<=0.14, 105 here, 97 at l>=0.80/c<=0.10) against a 4,900-photo
 *  corpus, so there is nothing to re-fit. */
export const PINK_MIN_LIGHTNESS = 0.76;
export const PINK_MAX_CHROMA = 0.12;

/** Mean share of the chromatic vote each family takes across the corpus.
 *
 *  Measured on 2026-09-27 over a 1,117-photo stratified sample — the first
 *  40 keys of each of the 28 trips in metadata.json order, so no single
 *  large trip (best-of at 572 photos, colombia-2024 at 484) can fit the
 *  priors to its own palette. 1,108 of those photos had chromatic pixels
 *  at all. Each number is the mean over those photos of that family's
 *  share of the photo's chroma-weighted vote, so the nine sum to 1.0 by
 *  construction (0.999 after rounding).
 *
 *  Read them as a description of the archive: a quarter of all colour in
 *  it is blue, gold and green take about a fifth each, and teal — which
 *  feels like the signature of the Caribbean folders — is 1.6%, because
 *  reef water is a handful of trips and jungle is most of them.
 *
 *  These drift slowly as the archive grows; they're a normaliser, not a
 *  hard boundary, so drift degrades the ranking gently rather than
 *  breaking it. Re-measure with
 *  `npm run photographyColors -- --measure-priors` if the composition
 *  changes materially — a first winter trip, say, or a large new
 *  underwater folder. Changing BROWN_MAX_LIGHTNESS or BROWN_MAX_CHROMA
 *  also requires re-measuring, since the earth split decides which pixels
 *  vote brown instead of gold and therefore moves three of these numbers.
 *  @type {Readonly<Record<string, number>>} */
export const FAMILY_PRIOR = {
  red: 0.064,
  orange: 0.088,
  gold: 0.187,
  brown: 0.164,
  green: 0.185,
  teal: 0.016,
  blue: 0.258,
  purple: 0.023,
  pink: 0.014,
};

// --- colour space -----------------------------------------------------

/** @param {number} channel 0-255 @returns {number} */
function srgbChannelToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Convert 8-bit sRGB to OKLCh. OKLab rather than HSL because HSL
 * saturation isn't perceptual — it calls both `#808000` and `#ffcccc`
 * "100% saturated", which scatters pale tints and deep pigments into the
 * same buckets. OKLab chroma tracks how colourful a pixel actually looks,
 * and its hue angle is near enough perceptually uniform that fixed degree
 * boundaries between families land where the eye puts them.
 *
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {{ l: number, c: number, h: number }} l 0-1, c ~0-0.4, h 0-360
 */
export function rgbToOklch(r, g, b) {
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Pure achromatic pixels have a meaningless atan2 result; pin them to 0
  // so callers never branch on floating-point noise.
  if (c < 1e-7) h = 0;
  return { l, c, h };
}

/** Parse `#rgb` / `#rrggbb` (case-insensitive, leading `#` optional).
 *  @param {string | null | undefined} hex
 *  @returns {{ r: number, g: number, b: number } | null} */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    if (!/^[0-9a-f]{3}$/i.test(raw)) return null;
    return {
      r: Number.parseInt(raw[0] + raw[0], 16),
      g: Number.parseInt(raw[1] + raw[1], 16),
      b: Number.parseInt(raw[2] + raw[2], 16),
    };
  }
  if (raw.length !== 6 || !/^[0-9a-f]{6}$/i.test(raw)) return null;
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

// --- family assignment ------------------------------------------------

/** Hue-family boundaries in OKLCh degrees, walking the circle from red.
 *  `to` is exclusive; anything outside these spans is red, which is how
 *  that family wraps past 358° through 0° to 35°.
 *
 *  These are not evenly spaced, because OKLCh hue is not evenly
 *  populated by named colours: sRGB red sits at 29°, orange-red at 35°,
 *  CSS `orange` at 71°, and pure yellow at 110° — so the whole
 *  red-through-yellow story happens in about 80° while blue gets 60° to
 *  itself. Boundaries were placed by measuring reference pigments
 *  (vermilion 29, sienna 45, ochre 60, amber 84, mustard 94, olive 110)
 *  rather than by dividing the circle into equal slices, which would put
 *  pure yellow in the green bucket. Corpus-independent, so unchanged.
 *  @type {ReadonlyArray<{ from: number, to: number, id: ColorBucketId }>} */
const HUE_FAMILIES = [
  { from: 35, to: 62, id: "orange" },
  { from: 62, to: 112, id: "gold" },
  { from: 112, to: 165, id: "green" },
  { from: 165, to: 215, id: "teal" },
  { from: 215, to: 275, id: "blue" },
  { from: 275, to: 318, id: "purple" },
  { from: 318, to: 358, id: "pink" },
];

/** Warm families that collapse to `brown` when dark *and* dull. */
const WARM_FAMILIES = new Set(["orange", "gold"]);

/** Chromatic families, in the order used for deterministic tie-breaks.
 *  @type {readonly ColorBucketId[]} */
export const CHROMATIC_FAMILIES = COLOR_BUCKETS.filter((b) => !b.neutral).map((b) => b.id);

/** The hue each family actually sits at in this archive: the chroma-weighted
 *  circular mean of every pixel that voted for it, measured over the
 *  1,117-photo sample. These are the same angles the swatches above were
 *  derived from, exported because ranking needs them too.
 *
 *  Membership says a photo belongs under Blue; it does not say how blue.
 *  Distance from these angles does, and it is what separates a photo that is
 *  squarely the family's colour from one sitting at the family's edge — a
 *  pale cyan at 218 degrees is inside the blue wedge and half a wedge away
 *  from what a reader means by blue. `strength` cannot express that, because
 *  it counts area and not which blue.
 *
 *  Brown is the one to read carefully: 72.4 degrees is inside gold's angular
 *  range, because Earth is not a hue at all. It is warm pixels demoted for
 *  being dark and dull (see BROWN_MAX_LIGHTNESS/BROWN_MAX_CHROMA), so its
 *  mean angle sits where the warm pixels are and lightness does the real
 *  separating. Ranking Earth by hue distance is therefore close to
 *  meaningless, which is why callers fall back to chroma for it.
 *  @type {Readonly<Record<string, number>>} */
export const FAMILY_HUE = {
  red: 22.0,
  orange: 51.6,
  gold: 83.1,
  brown: 72.4,
  green: 128.9,
  teal: 196.3,
  blue: 248.6,
  purple: 291.0,
  pink: 347.8,
};

/** Shortest angular distance between two hues, in degrees (0-180).
 *  Goes the short way round the circle, so red at 2 degrees is 4 degrees
 *  from red at 358, not 356.
 *  @param {number} a @param {number} b @returns {number} */
export function hueDistance(a, b) {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Classify one OKLCh sample into a chromatic family, or null when it's
 * too achromatic to carry a hue.
 *
 * @param {{ l: number, c: number, h: number }} sample
 * @returns {ColorBucketId | null}
 */
export function familyForOklch({ l, c, h }) {
  if (!(c >= CHROMA_FLOOR)) return null;
  const hue = ((h % 360) + 360) % 360;
  let id = /** @type {ColorBucketId} */ ("red");
  for (const family of HUE_FAMILIES) {
    if (hue >= family.from && hue < family.to) {
      id = family.id;
      break;
    }
  }
  if (WARM_FAMILIES.has(id) && l <= BROWN_MAX_LIGHTNESS && c <= BROWN_MAX_CHROMA) return "brown";
  if (id === "red" && l >= PINK_MIN_LIGHTNESS && c <= PINK_MAX_CHROMA) return "pink";
  return id;
}

/** @param {number} lightness @returns {ColorBucketId} */
export function neutralForLightness(lightness) {
  if (lightness >= WHITE_MIN_LIGHTNESS) return "white";
  if (lightness <= BLACK_MAX_LIGHTNESS) return "black";
  return "grey";
}

/**
 * Classify a single hex colour into exactly one bucket. This is the
 * one-colour unit the histogram path is built from — useful for a swatch
 * or a theme colour, and the readable thing to test family boundaries
 * against. Photos go through `colorProfileFromHistogram` instead, because
 * a single averaged colour is exactly the input this whole module exists
 * to avoid relying on.
 *
 * @param {string | null | undefined} hex
 * @returns {ColorBucketId | null} null when the input isn't a colour.
 */
export function bucketForHex(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const sample = rgbToOklch(rgb.r, rgb.g, rgb.b);
  return familyForOklch(sample) ?? neutralForLightness(sample.l);
}

/**
 * @typedef {object} HistogramEntry
 * @property {number} r     0-255
 * @property {number} g     0-255
 * @property {number} b     0-255
 * @property {number} count Pixels represented by this entry.
 */

/**
 * @typedef {object} ColorProfile
 * @property {ColorBucketId[]} buckets   Families the photo reads as, best-first.
 * @property {Record<string, number>} strength  Per-listed-family share of the whole
 *   image (0-1), chroma-weighted. Comparable across photos within one family;
 *   NOT comparable across families, which is what the prior-normalised score is for.
 * @property {number | null} hue   Chroma-weighted circular mean hue of the chromatic
 *   pixels, in degrees, or null when there are none (or when they cancel out).
 * @property {number} lightness    Pixel-weighted mean OKLCh lightness, 0-1.
 * @property {number} chroma       Pixel-weighted mean OKLCh chroma, over all pixels.
 */

/** Resultant length, as a fraction of the total hue weight, below which
 *  the circular mean has no defined direction and `hue` is reported as
 *  null. This is not a tuning knob — it only catches the degenerate case
 *  where the chromatic pixels cancel almost exactly (a frame split
 *  between complementary colours), where any single angle we returned
 *  would be a coin flip and would place the photo somewhere arbitrary on
 *  the spectrum page. Those photos sort with the achromatic tail by
 *  lightness instead, which is honest about there being no one hue. */
const HUE_RESULTANT_FLOOR = 1e-6;

/**
 * Reduce a pixel histogram to the colour families a viewer would say the
 * photo "is", plus the three scalar descriptors the spectrum page sorts
 * by. The whole point of the filter lives here.
 *
 *  1. Split pixels into chromatic (OKLCh chroma >= CHROMA_FLOOR) and
 *     achromatic. The chromatic *fraction* decides whether this is a
 *     colour photo at all.
 *  2. Vote each chromatic pixel into its hue family, weighted by chroma.
 *  3. Divide each family's share by its corpus prior, and keep the
 *     families clearing both MIN_FAMILY_SHARE and MIN_FAMILY_SCORE, best
 *     score first, capped at MAX_FAMILIES.
 *  4. Append a white/grey/black band for photos that are wholly or mostly
 *     achromatic, chosen by the mean lightness.
 *
 * `buckets[0]` is the photo's primary colour, so callers wanting a single
 * value can take the head. `strength[id]` is the chroma-weighted share of
 * the *whole image* that family occupies (0-1) — the number to sort by
 * when someone has asked for "the reddest photos", as opposed to the
 * prior-normalised score, which decides membership and cannot order
 * within a family at all.
 *
 * @param {Iterable<HistogramEntry>} entries
 * @returns {ColorProfile} `buckets` empty only when the histogram has no pixels.
 */
export function colorProfileFromHistogram(entries) {
  /** @type {Map<ColorBucketId, number>} */
  const familyVote = new Map();
  /** Achromatic pixels split by their own lightness band, so a neutral
   *  band can report a real amount rather than inheriting the whole
   *  achromatic remainder.
   *  @type {Map<ColorBucketId, number>} */
  const neutralPixels = new Map();
  let totalPixels = 0;
  let chromaticPixels = 0;
  let lightnessSum = 0;
  let chromaSum = 0;
  // The circular mean is accumulated as a vector sum, NOT as an average
  // of angles. Averaging 359° and 1° arithmetically gives 180° — a red
  // photo would be reported as teal and land on the far side of the
  // spectrum page from where it belongs. Summing unit vectors and taking
  // atan2 of the result is the only correct mean on a circle.
  let hueX = 0;
  let hueY = 0;
  let hueWeight = 0;

  for (const entry of entries) {
    const count = entry.count;
    if (!(count > 0)) continue;
    const sample = rgbToOklch(entry.r, entry.g, entry.b);
    totalPixels += count;
    lightnessSum += sample.l * count;
    chromaSum += sample.c * count;

    const family = familyForOklch(sample);
    if (!family) {
      const band = neutralForLightness(sample.l);
      neutralPixels.set(band, (neutralPixels.get(band) ?? 0) + count);
      continue;
    }
    chromaticPixels += count;
    // Same weight as the family vote, deliberately: the mean hue and the
    // family the photo lands in have to agree, or the spectrum ordering
    // and the colour pages would tell two different stories about the
    // same picture.
    const vote = count * Math.min(1, sample.c / CHROMA_FULL_WEIGHT);
    familyVote.set(family, (familyVote.get(family) ?? 0) + vote);
    const rad = (sample.h * Math.PI) / 180;
    hueX += Math.cos(rad) * vote;
    hueY += Math.sin(rad) * vote;
    hueWeight += vote;
  }

  if (totalPixels === 0) return { buckets: [], strength: {}, hue: null, lightness: 0, chroma: 0 };

  const pixels = totalPixels;
  const lightness = lightnessSum / totalPixels;
  const chroma = chromaSum / totalPixels;

  /** @type {number | null} */
  let hue = null;
  if (hueWeight > 0 && Math.hypot(hueX, hueY) / hueWeight > HUE_RESULTANT_FLOOR) {
    hue = ((((Math.atan2(hueY, hueX) * 180) / Math.PI) % 360) + 360) % 360;
  }

  const achromaticFraction = (totalPixels - chromaticPixels) / totalPixels;
  /** Amount of one band actually present. Falls back to the achromatic
   *  remainder for the rare photo whose mean lightness names a band no
   *  individual pixel landed in (a frame split between white and black
   *  averages to grey), and to 1 for one with no achromatic pixels at
   *  all, where the band is a description of the whole image.
   *  @param {ColorBucketId} band @returns {number} */
  const neutralStrength = (band) => {
    const own = (neutralPixels.get(band) ?? 0) / pixels;
    if (own > 0) return own;
    return achromaticFraction > 0 ? achromaticFraction : 1;
  };
  /** @param {ColorBucketId[]} picked @returns {Record<string, number>} */
  const strengthFor = (picked) => {
    /** @type {Record<string, number>} */
    const out = {};
    for (const id of picked) {
      const vote = familyVote.get(id);
      out[id] = vote === undefined ? neutralStrength(id) : vote / pixels;
    }
    return out;
  };

  const neutral = neutralForLightness(lightness);
  const chromaticFraction = chromaticPixels / totalPixels;
  if (chromaticFraction < NEUTRAL_MAX_CHROMATIC_FRACTION || familyVote.size === 0) {
    // An achromatic photo keeps its measured hue at null even when a few
    // tinted pixels survived the floor: it has no hue worth sorting by,
    // and the spectrum page relies on that to park it in the neutral
    // tail rather than wedged between two colour photos.
    return { buckets: [neutral], strength: strengthFor([neutral]), hue: null, lightness, chroma };
  }

  const totalVote = [...familyVote.values()].reduce((sum, vote) => sum + vote, 0);
  /** @type {Array<{ id: ColorBucketId, score: number, share: number }>} */
  const scored = [];
  for (const [id, vote] of familyVote) {
    const share = vote / totalVote;
    if (share < MIN_FAMILY_SHARE) continue;
    const score = share / Math.max(FAMILY_PRIOR[id] ?? MIN_PRIOR, MIN_PRIOR);
    if (score < MIN_FAMILY_SCORE) continue;
    scored.push({ id, score, share });
  }
  // Deterministic order: best score first, ties broken by ring position
  // so the same histogram always bakes the same array.
  scored.sort(
    (a, b) =>
      b.score - a.score || CHROMATIC_FAMILIES.indexOf(a.id) - CHROMATIC_FAMILIES.indexOf(b.id),
  );

  /** @type {ColorBucketId[]} */
  let picked = scored.slice(0, MAX_FAMILIES).map((s) => s.id);

  // Nothing cleared the bar but the photo is still colourful — fall back
  // to its plurality family so a colour photo never lands in a neutral
  // band by default.
  if (picked.length === 0) {
    let bestId = /** @type {ColorBucketId | null} */ (null);
    let bestVote = 0;
    for (const [id, vote] of familyVote) {
      if (vote > bestVote) {
        bestVote = vote;
        bestId = id;
      }
    }
    if (bestId && bestVote / totalVote >= MIN_FAMILY_SHARE) picked = [bestId];
  }

  if (chromaticFraction < MUTED_MAX_CHROMATIC_FRACTION) picked.push(neutral);
  const buckets = picked.length > 0 ? picked : [neutral];
  return { buckets, strength: strengthFor(buckets), hue, lightness, chroma };
}

/**
 * Membership only, for callers that don't need the amounts.
 *
 * @param {Iterable<HistogramEntry>} entries
 * @returns {ColorBucketId[]} Empty only when the histogram has no pixels.
 */
export function bucketsFromHistogram(entries) {
  return colorProfileFromHistogram(entries).buckets;
}

/**
 * Per-family vote shares for one histogram, before any prior or
 * threshold. This is the raw material `--measure-priors` averages over a
 * sample to fit FAMILY_PRIOR, and it exists here rather than in the
 * script so the measurement uses exactly the same chroma weighting the
 * classifier votes with. Shares sum to 1 over the chromatic pixels, or
 * the map is empty when there are none.
 *
 * @param {Iterable<HistogramEntry>} entries
 * @returns {Record<string, number>}
 */
export function familyVoteShares(entries) {
  /** @type {Map<string, number>} */
  const familyVote = new Map();
  let totalVote = 0;
  for (const entry of entries) {
    if (!(entry.count > 0)) continue;
    const sample = rgbToOklch(entry.r, entry.g, entry.b);
    const family = familyForOklch(sample);
    if (!family) continue;
    const vote = entry.count * Math.min(1, sample.c / CHROMA_FULL_WEIGHT);
    familyVote.set(family, (familyVote.get(family) ?? 0) + vote);
    totalVote += vote;
  }
  /** @type {Record<string, number>} */
  const out = {};
  if (totalVote === 0) return out;
  for (const [id, vote] of familyVote) out[id] = vote / totalVote;
  return out;
}
