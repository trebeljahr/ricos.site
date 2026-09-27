/**
 * The only runtime reader of src/content/photography-colors.json.
 *
 * That file is baked by `npm run photographyColors` (see
 * src/scripts/photographyColors.ts) and committed, so nothing here decodes
 * an image or measures a colour — this module turns the baked numbers into
 * the three shapes the pages need: counts for the wheel, an ordered list of
 * photos per family, and one colour-ordered list
 * for /photography/spectrum.
 *
 * Everything is derived once at module scope, because the JSON cannot change
 * without a rebuild and these run on every page render. Sorting 4,359 photos
 * by strength on each request would be work done again for an answer that is
 * already known.
 *
 * WHICH NUMBER ANSWERS WHICH QUESTION
 * -----------------------------------
 * `buckets` is membership — "would a person filing this photo put it under
 * the red swatch" — and it is decided by a prior-normalised score, so it is
 * comparable between families. `strength` is the chroma-weighted share of
 * the whole frame that family occupies, which is comparable between photos
 * inside one family and meaningless between families: `blue: 0.30` is not
 * "more" than `gold: 0.50`, because a quarter of all colour in this archive
 * is blue. So membership picks the set and strength orders it, and neither
 * can do the other's job. src/lib/colorBuckets.mjs has the long version.
 *
 * WHAT THE STRIP ACTUALLY HOLDS
 * -----------------------------
 * The bake classifies 4,900 keys, all of them under assets/photography.
 * `keys()` drops the 541 that are a second copy of a photo filed under both a
 * trip and best-of, leaving 4,359 distinct photographs.
 *
 * Of those, 1,950 reach the strip: 1,815 that read as a single colour, and the
 * 135 with no measurable colour at all. The 2,544 left out are the ones
 * carrying two colours at once or a colour too faint to name, and leaving them
 * out is the feature rather than a shortfall — they were what made a sweep
 * through the archive look like a grid with the colours roughly sorted. See
 * MIN_BAND_STRENGTH and MIN_BAND_DOMINANCE.
 *
 *   green   656   gold    466   blue    528   orange  116
 *   purple   21   red      19   teal      6   pink      3
 *   grey     93   black    23   white    19
 *
 * The small bands are small because this archive is: six photographs are
 * unambiguously teal and three unambiguously pink. A band of three is honest,
 * where a band of 128 padded out with frames that merely contained some
 * turquoise was not.
 *
 * All eight chromatic families are ones a viewer would agree with — the
 * strongest greens are backlit leaves and ferns, the strongest blues are
 * underwater and sky, teal is reef water and turquoise paint, red is a rum
 * cellar and a crimson wall.
 *
 * There used to be a ninth, Earth, and it was the one that did not hold up:
 * sandstone forts and unpaved roads, which is what the label promises, mixed
 * with gilded ceilings and golden-hour hallways that a person would call
 * gold. It was a demotion of dark dull warm pixels rather than a hue of its
 * own, and warm interior light is dark and dull by that measure. It has been
 * removed; see WHY THERE IS NO EARTH FAMILY in src/lib/colorBuckets.mjs.
 *
 * Purple is the one left to watch, at 21 photos: lightning and asters, and a
 * fish-market counter that is really blue-grey.
 */
import type { ImageProps } from "src/@types";
import baked from "src/content/photography-colors.json";
import {
  CHROMATIC_FAMILIES,
  COLOR_BUCKETS,
  type ColorBucketId,
  isColorBucketId,
  neutralForLightness,
} from "src/lib/colorBuckets.mjs";
import { getLocalMetadata } from "src/lib/imageMetadata";

export type PhotoColorEntry = {
  /** Families this photo reads as, strongest-scoring first. */
  buckets: ColorBucketId[];
  /** Chroma-weighted share of the whole frame, one entry per listed bucket. */
  strength: Partial<Record<ColorBucketId, number>>;
  /** Mean hue of each listed chromatic family's own pixels, in degrees. The
   *  spectrum orders on this. */
  familyHue: Partial<Record<ColorBucketId, number>>;
  /** Chroma-weighted circular mean hue in degrees, or null for a photo with
   *  no hue worth sorting by. */
  hue: number | null;
  lightness: number;
  chroma: number;
};

/** The baked file, widened from the literal type `resolveJsonModule` infers
 *  for 4,900 keys. The cast is the one place that trusts the bake script's
 *  output shape; the data contract is version 1. */
type BakedColorFile = {
  version: number;
  measuredOn: string;
  sample: { images: number; trips: number };
  priors: Record<string, number>;
  images: Record<string, PhotoColorEntry>;
};

const file = baked as unknown as BakedColorFile;

/** Every classified photo, keyed exactly as metadata.json keys it
 *  ("assets/photography/<trip>/<file>", no leading slash). */
const entries: Record<string, PhotoColorEntry> = file.images ?? {};

let liveKeys: string[] | null = null;

/** The baked keys metadata.json still knows about, which is every key the
 *  rest of this module is allowed to look at.
 *
 *  A photo deleted from the Notes submodule since the last bake keeps its
 *  row until the bake script next runs and drops it. Filtering it out here
 *  rather than only where tiles are built is what keeps the count on the
 *  wheel equal to the number of photos on the page behind it — a swatch
 *  labelled 1,183 that opens onto 1,182 tiles is a bug a reader can see.
 *
 *  WHY THIS ALSO DE-DUPLICATES BY FILENAME
 *  ---------------------------------------
 *  `best-of` is not a trip. It is a curated second copy of photos that also
 *  live in the trip they were shot on: 503 of its 572 files have a twin
 *  elsewhere under the same filename. Every trip gallery reads exactly one
 *  folder, so that has never mattered before. These pages are the first
 *  thing on the site to aggregate across folders, and without this filter
 *  the same photograph appears twice in one grid — 144 repeats in blue, 201
 *  in green — with the duplicate pair adjacent, because two copies of one
 *  file have identical colour and therefore sort together. That reads as a
 *  rendering fault, and it also double-counts the photo in the trips row,
 *  where `best-of` then shows up as the biggest "place" a colour comes from.
 *
 *  The non-best-of copy wins, so a photo is attributed to the trip it was
 *  actually shot on. Twenty-eight filenames collide between two real trips;
 *  those fall back to the lexicographically first key, which is arbitrary
 *  but stable, and stability is what the lightbox needs. */
function keys(): string[] {
  if (liveKeys) return liveKeys;
  const metadata = getLocalMetadata();
  const live = Object.keys(entries).filter((src) => metadata[src] !== undefined);

  const filename = (src: string) => src.slice(src.lastIndexOf("/") + 1);
  const isBestOf = (src: string) => src.split("/")[2] === "best-of";

  const winners = new Map<string, string>();
  for (const src of live) {
    const name = filename(src);
    const held = winners.get(name);
    if (!held) {
      winners.set(name, src);
      continue;
    }
    // Prefer the copy filed under a real trip; then the smaller key, so the
    // choice does not depend on object key order.
    const better = isBestOf(held) !== isBestOf(src) ? !isBestOf(src) : src < held;
    if (better) winners.set(name, src);
  }

  const kept = new Set(winners.values());
  liveKeys = live.filter((src) => kept.has(src));
  return liveKeys;
}

/** Resolve one key to the shape the galleries take. Only ever called with a
 *  key from `keys()`, so the metadata lookup cannot miss. */
function imageFor(src: string): ImageProps {
  const meta = getLocalMetadata()[src];
  if (!meta) throw new Error(`no metadata for classified photo: ${src}`);
  return { src, width: meta.width, height: meta.height };
}

const NEUTRAL_IDS = new Set<string>(COLOR_BUCKETS.filter((b) => b.neutral).map((b) => b.id));

/** What it takes for a photo to be in the spectrum at all.
 *
 *  The strip is not the archive and does not try to be. It is the photographs
 *  that read as one colour, because those are the only ones a gradient can be
 *  made of: a frame that is equal parts sky and sandstone has no place on a
 *  hue axis, and putting it there is what made the sweep look like a grid with
 *  the colours roughly sorted rather than a spectrum.
 *
 *  Two bars, and a photo has to clear both.
 *
 *  `MIN_BAND_STRENGTH` is how much of the frame the colour covers, weighted by
 *  chroma. At 0.06 — the first attempt — a photo qualified on a colour
 *  occupying a sixteenth of it, which is an accent, not a subject.
 *
 *  `MIN_BAND_DOMINANCE` is the share of the photo's *colour* that the winning
 *  family holds, and it is the bar that does the work the first one could not.
 *  Strength alone keeps a photo that is 20% blue and 20% gold: it has plenty
 *  of blue, and it reads as neither. Requiring three quarters of the colour in
 *  the frame to belong to one family is what "reads as one colour" actually
 *  means.
 *
 *  Together they keep 1,815 of 4,359 photographs. That is the point rather
 *  than a cost — the 2,544 left out are the ones that were making the seams
 *  look arbitrary. Photos with no measurable colour at all are a separate
 *  case and are kept, because they do read as one thing: see `imagesBySpectrum`. */
const MIN_BAND_STRENGTH = 0.15;
const MIN_BAND_DOMINANCE = 0.75;

const primaryCache = new Map<string, ColorBucketId>();

/** The one family a photo belongs to: the chromatic family occupying most of
 *  the frame, or its neutral band when no colour does.
 *
 *  WHY THIS IS NOT `buckets[0]`
 *  ----------------------------
 *  `buckets` is ordered by the prior-normalised score, which answers "is this
 *  photo unusually teal *for this archive*". That is the right question for
 *  deciding membership and the wrong one for deciding what a photo is, because
 *  the prior deliberately amplifies rare colours. Measured over the 1,708
 *  photos carrying more than one family, the score-first family is not the one
 *  covering most of the frame in 43% of cases — a street mural that is 24%
 *  blue and 16% teal was filed under teal, because teal is rare here and blue
 *  is not.
 *
 *  That is what made the pages look wrong. The teal page opened on genuinely
 *  turquoise water and then, a few rows down, showed a jungle stream, a
 *  portrait, a mural and a butterfly together — four photos with nothing
 *  visible in common except that each was a little bit teal and teal was
 *  scarce enough to win the argument.
 *
 *  Strength answers the question a reader is actually asking, so it decides
 *  the family. The prior still does its job: it is what got a genuinely
 *  turquoise photo into the teal family in the first place, against an archive
 *  where gold and green are everywhere. */
export function primaryFamily(src: string): ColorBucketId {
  const cached = primaryCache.get(src);
  if (cached) return cached;
  const entry = entries[src];
  let best: ColorBucketId | null = null;
  let bestStrength = -1;
  for (const id of new Set(entry.buckets)) {
    if (!isColorBucketId(id) || NEUTRAL_IDS.has(id)) continue;
    const strength = entry.strength[id] ?? 0;
    // Ring order breaks a tie, so the same row always resolves the same way.
    if (strength > bestStrength) {
      bestStrength = strength;
      best = id;
    }
  }
  // No colour at all: the photo lives in a lightness band, the one the bake
  // assigned if there is one and otherwise the band its mean lightness falls
  // in. A photo whose colour is merely *weak* still comes back with that
  // colour here; whether it is strong enough to appear at all is
  // `readsAsOneColour`'s question, not this one.
  const resolved =
    best ??
    (entry.buckets.find((id) => isColorBucketId(id) && NEUTRAL_IDS.has(id)) as
      | ColorBucketId
      | undefined) ??
    neutralForLightness(entry.lightness);
  primaryCache.set(src, resolved);
  return resolved;
}

/** Signed distance from `centre` to `hue`, in (-180, 180].
 *
 *  The sort key that keeps a band continuous across the top of the circle.
 *  Raw angles cannot do it: red spans 342 degrees through 0 to 35, so sorting
 *  its members by angle puts the 342s after the 35s and the strip jumps almost
 *  all the way round the circle on its way out of the band. Measured from the
 *  band's own centre, 342 comes back as -28 and lands where the eye expects
 *  it.
 *
 *  Exported for the tests: it is the one piece of this file's ordering that is
 *  pure arithmetic, and the one most likely to be quietly broken by a later
 *  change to the modulo. */
export function hueOffset(hue: number, centre: number): number {
  return ((((hue - centre) % 360) + 540) % 360) - 180;
}

/** Whether a photo reads as one colour, and so belongs in the sweep.
 *
 *  Answers no for a photo with plenty of one colour that also has plenty of
 *  another: `MIN_BAND_DOMINANCE` is measured against the photo's own colour
 *  rather than against the frame, so a half-and-half picture fails however
 *  vivid both halves are. */
function readsAsOneColour(src: string): boolean {
  const entry = entries[src];
  let top = 0;
  let total = 0;
  for (const id of new Set(entry.buckets)) {
    if (!isColorBucketId(id) || NEUTRAL_IDS.has(id)) continue;
    const strength = entry.strength[id] ?? 0;
    total += strength;
    if (strength > top) top = strength;
  }
  if (total === 0) return false;
  return top >= MIN_BAND_STRENGTH && top / total >= MIN_BAND_DOMINANCE;
}

let hueOrder: ImageProps[] | null = null;

/** Every photo in one sweep: banded by the family it belongs to, walking the
 *  ring red → orange → gold → green → teal → blue → purple → pink, most
 *  saturated first inside each band, then the colourless tail by lightness.
 *
 *  WHY THIS IS NOT SORTED BY HUE ANGLE, WHICH IS WHAT IT LOOKS LIKE IT WANTS
 *  ------------------------------------------------------------------------
 *  It was, and the page did not work. Sorting all 4,359 photos by their mean
 *  hue produced something indistinguishable from a random grid: the "red"
 *  end opened with snow mountains, a grey building and a dog.
 *
 *  The reason is in the data. `hue` is the chroma-weighted circular mean of
 *  a photo's chromatic pixels, and in this archive 57% of photos have a mean
 *  chroma under 0.05 against a CHROMA_FLOOR of 0.045 — they are, as whole
 *  images, very close to grey. Their mean hue is computed from a thin sliver
 *  of barely-tinted pixels, so it is a real number carrying almost no visual
 *  information, and it lands them anywhere on the circle. Measured against
 *  the classifier: for 24% of photos the wedge their mean hue falls in is
 *  not even the family they belong to. Ordering by that number scatters
 *  washed-out photos evenly through every region and there is no gradient
 *  left to see.
 *
 *  Membership does carry the information, because it is prior-normalised and
 *  thresholded — it already answers "is this photo unusually blue *for this
 *  archive*", which is the question a reader scrolling a spectrum is asking.
 *  So the band comes from the family and only the ordering inside a band
 *  comes from the angle, where the noise can shuffle neighbours a little but
 *  cannot move a photo out of the colour it actually reads as.
 *
 *  A pale photo still sits in its band and still looks pale. That is honest:
 *  it is a washed-out blue, and it belongs among the blues.
 *
 *  The colourless tail cannot be interleaved, because a photo with no hue has
 *  no place on a hue axis — inserting a foggy morning at some arbitrary angle
 *  would break the sweep exactly where a reader is following it. Putting them
 *  after, ordered black to white, gives the page one long colour sweep and
 *  then one short greyscale one, which is honest about the difference. */
export function imagesBySpectrum(): ImageProps[] {
  if (hueOrder) return hueOrder;
  const live = keys();

  const bandOf = (src: string) => CHROMATIC_FAMILIES.indexOf(primaryFamily(src));
  /** The hue of the family a photo is filed under, over that family's own
   *  pixels — not the whole-frame average, which for a picture of two colours
   *  is a third colour it does not contain. */
  const familyHueOf = (src: string) => entries[src].familyHue?.[primaryFamily(src)];

  const chromatic = live.filter(
    (src) => bandOf(src) >= 0 && familyHueOf(src) !== undefined && readsAsOneColour(src),
  );

  /** Each family's centre, as the circular mean of its members' family hues.
   *  Measured rather than declared so it cannot drift from what the band holds. */
  const centre = new Map<ColorBucketId, number>();
  {
    const sin = new Map<ColorBucketId, number>();
    const cos = new Map<ColorBucketId, number>();
    for (const src of chromatic) {
      const family = primaryFamily(src);
      const radians = ((familyHueOf(src) ?? 0) * Math.PI) / 180;
      sin.set(family, (sin.get(family) ?? 0) + Math.sin(radians));
      cos.set(family, (cos.get(family) ?? 0) + Math.cos(radians));
    }
    for (const family of sin.keys()) {
      const degrees = (Math.atan2(sin.get(family) ?? 0, cos.get(family) ?? 0) * 180) / Math.PI;
      centre.set(family, (degrees + 360) % 360);
    }
  }

  // Band first, then hue within the band.
  //
  // Sorting on the hue alone very nearly works now that it is measured per
  // family — a family's pixels are assigned by angle, so its mean sits inside
  // its own wedge and the bands fall out contiguous and in ring order for
  // free. Pink is the exception and the reason this sorts on the band
  // explicitly: `familyForOklch` sends pale reds to pink as well as the
  // 318-358 arc, so pink holds members at 4 degrees, and one of them sorted to
  // the very front of the strip, ahead of red. The scale reads each band's
  // first index and assumes one run per family, so a single stray photo made
  // it label the start of the sweep "Pink".
  //
  // Within a band, distance from that band's own centre rather than the raw
  // angle, so the families that span zero stay in one piece. See `hueOffset`.
  const ordered = chromatic.sort((a, b) => {
    const byBand = bandOf(a) - bandOf(b);
    if (byBand) return byBand;
    const family = primaryFamily(a);
    const from = centre.get(family) ?? 0;
    const byHue = hueOffset(familyHueOf(a) ?? 0, from) - hueOffset(familyHueOf(b) ?? 0, from);
    if (byHue) return byHue;
    return entries[b].chroma - entries[a].chroma || a.localeCompare(b);
  });

  // Lightest first, so the sweep leaves the last colour for white and dims to
  // black rather than dropping straight from a colour into the darkest frames
  // in the archive.
  // The colourless tail: photos with no chromatic family at all. They are kept
  // while photos with a weak or divided colour are dropped, and the difference
  // is not arbitrary — "no colour" is itself a clear reading, and these frames
  // are white, grey or black to look at. A photo that is faintly two colours
  // is not clearly anything, which is the whole test.
  const rest = live
    .filter((src) => bandOf(src) < 0)
    .sort((a, b) => entries[b].lightness - entries[a].lightness || a.localeCompare(b));

  hueOrder = [...ordered, ...rest].map(imageFor);
  return hueOrder;
}

/** The baked row for one photo, or null when it was never classified — a
 *  photo added since the last bake, or one sharp could not decode. Callers
 *  treat null as "no colour information", never as "no colour". */
export function entryFor(src: string): PhotoColorEntry | null {
  return entries[src] ?? null;
}
