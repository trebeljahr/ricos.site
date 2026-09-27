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
 * HOW THE FAMILIES ACTUALLY CAME OUT, OVER THE 4,359 PHOTOS THESE PAGES SHOW
 * -------------------------------------------------------------------------
 * The bake classifies 4,900 keys; `keys()` below drops the 541 that are a
 * second copy of a photo under another prefix, so every figure here is over
 * the 4,359 distinct photographs a reader can actually reach.
 *
 *   gold  1,549 (35.5%)   green 1,520 (34.9%)   blue  1,183 (27.1%)
 *   orange  986 (22.6%)   red     491 (11.3%)
 *   grey    195  (4.5%)   purple  140  (3.2%)  teal    128  (2.9%)
 *   pink     89  (2.0%)   black    54  (1.2%)  white    29  (0.7%)
 * A photo can list up to three families plus a neutral band, so these sum
 * past 100% — to 6,364, about 1.5 families per photo: 2,581 photos list one
 * family, 1,558 two, 213 three and 7 get a neutral band on top of three.
 * 135 photos (3.1%) have no hue at all and live only in a neutral band.
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
 * Purple is the one left to watch, at 140 photos: lightning and asters at the
 * top, then a fish-market counter that is really blue-grey.
 */
import type { ImageProps } from "src/@types";
import baked from "src/content/photography-colors.json";
import {
  CHROMATIC_FAMILIES,
  COLOR_BUCKETS,
  type ColorBucketId,
  isColorBucketId,
} from "src/lib/colorBuckets.mjs";
import { getLocalMetadata } from "src/lib/imageMetadata";

export type PhotoColorEntry = {
  /** Families this photo reads as, strongest-scoring first. */
  buckets: ColorBucketId[];
  /** Chroma-weighted share of the whole frame, one entry per listed bucket. */
  strength: Partial<Record<ColorBucketId, number>>;
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
  // No colour at all: the photo lives in whichever neutral band it was given.
  const resolved =
    best ??
    (entry.buckets.find((id) => isColorBucketId(id) && NEUTRAL_IDS.has(id)) as
      | ColorBucketId
      | undefined) ??
    "grey";
  primaryCache.set(src, resolved);
  return resolved;
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

  const chromatic = live
    .filter((src) => bandOf(src) >= 0 && entries[src].hue !== null)
    .sort((a, b) => {
      const byBand = bandOf(a) - bandOf(b);
      if (byBand) return byBand;
      // Inside a band, most saturated first.
      //
      // Ascending hue angle was the obvious choice and it was wrong for this
      // archive. Median chroma here is about 0.046 against a CHROMA_FLOOR of
      // 0.045, so most photos are close to grey as whole images; ordering a
      // band by angle spread its few vivid members evenly through it and
      // opened every band on whatever happened to sit at its low edge,
      // usually something washed out. A band that starts grey does not read
      // as its colour at all.
      //
      // Leading with chroma puts the photographs that actually show the
      // colour at the top of each band, and the band fades out towards its
      // pale members rather than starting there. Angle then breaks the tie,
      // so the sweep still moves through the wedge among equally saturated
      // photos.
      const byChroma = entries[b].chroma - entries[a].chroma;
      if (byChroma) return byChroma;
      return (entries[a].hue ?? 0) - (entries[b].hue ?? 0) || a.localeCompare(b);
    });

  const achromatic = live
    .filter((src) => !(bandOf(src) >= 0 && entries[src].hue !== null))
    .sort((a, b) => entries[a].lightness - entries[b].lightness || a.localeCompare(b));

  hueOrder = [...chromatic, ...achromatic].map(imageFor);
  return hueOrder;
}

/** The baked row for one photo, or null when it was never classified — a
 *  photo added since the last bake, or one sharp could not decode. Callers
 *  treat null as "no colour information", never as "no colour". */
export function entryFor(src: string): PhotoColorEntry | null {
  return entries[src] ?? null;
}
