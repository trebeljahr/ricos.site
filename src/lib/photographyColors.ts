/**
 * The only runtime reader of src/content/photography-colors.json.
 *
 * That file is baked by `npm run photographyColors` (see
 * src/scripts/photographyColors.ts) and committed, so nothing here decodes
 * an image or measures a colour — this module turns the baked numbers into
 * the three shapes the pages need: counts for the wheel, an ordered list of
 * photos per family for /photography/colors/<id>, and one hue-ordered list
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
  FAMILY_HUE,
  hueDistance,
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

export type PhotoColorCounts = Record<ColorBucketId, number>;

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

let counts: PhotoColorCounts | null = null;

/** How many photos list each family. A photo listing `["green", "blue"]`
 *  counts under both, matching the filter, which matches on membership
 *  rather than on the primary family — so these totals sum to more than the
 *  4,359 photos these pages show. Every family starts at zero, so a caller
 *  never reads undefined for a swatch nothing landed in. */
export function colorBucketCounts(): PhotoColorCounts {
  if (counts) return counts;
  const tally = Object.fromEntries(COLOR_BUCKETS.map((b) => [b.id, 0])) as PhotoColorCounts;
  for (const src of keys()) {
    // A duplicated id in a hand-edited JSON must not inflate a bucket past
    // the number of photos actually in it.
    for (const id of new Set(entries[src].buckets)) {
      if (isColorBucketId(id) && id in tally) tally[id] += 1;
    }
  }
  counts = tally;
  return counts;
}

const bucketIndex = new Map<ColorBucketId, ImageProps[]>();

/** Photos listing `id`, the ones carrying most of that colour first.
 *
 *  Ties break on the key so the sequence is stable across renders: the
 *  lightbox walks this same array with prev/next and must not disagree with
 *  the grid it was opened from. Strength is the right order here and the
 *  prior-normalised score is not — the score decided membership and is a
 *  monotone transform inside one family, so it cannot rank at all. */
export function imagesForBucket(id: ColorBucketId): ImageProps[] {
  const cached = bucketIndex.get(id);
  if (cached) return cached;
  const centre = FAMILY_HUE[id];
  const images = keys()
    .filter((src) => entries[src].buckets.includes(id))
    .sort((a, b) => {
      const byStrength = (entries[b].strength[id] ?? 0) - (entries[a].strength[id] ?? 0);
      if (byStrength) return byStrength;
      // Strength alone cannot order these pages. It is baked at three
      // decimals, and across 1,183 blue photos that left 49% of adjacent
      // pairs holding the *identical* value — 64% in red, where strengths
      // are small and round together hardest. Every one of those ties used
      // to fall through to the key compare below, which is alphabetical by
      // path, so past the first screen the page stopped being sorted by
      // colour at all and became sorted by trip name: a run of guadeloupe,
      // then a run of dominica. The colour ordering was real only until the
      // first tie, which arrived within a few rows.
      //
      // So ties break on the colour the photo actually carries, finest
      // signal first. Chroma leads: given two photos with the same amount
      // of blue, the more saturated one is the one a reader means. Hue
      // distance follows, because a photo sitting at the family's centre is
      // more that colour than one at its edge.
      const byChroma = entries[b].chroma - entries[a].chroma;
      if (byChroma) return byChroma;
      if (centre !== undefined) {
        const ha = entries[a].hue;
        const hb = entries[b].hue;
        // A photo with no hue has no distance; it sorts after ones that do.
        if (ha !== null && hb !== null) {
          const byHue = hueDistance(ha, centre) - hueDistance(hb, centre);
          if (byHue) return byHue;
        } else if (ha !== hb) {
          return ha === null ? 1 : -1;
        }
      }
      // Last resort, and now genuinely a last resort: stable across renders
      // because the lightbox walks this same array and must not disagree
      // with the grid it was opened from.
      return a.localeCompare(b);
    })
    .map(imageFor);
  bucketIndex.set(id, images);
  return images;
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

  const bandOf = (src: string) => {
    const primary = entries[src].buckets[0];
    const index = CHROMATIC_FAMILIES.indexOf(primary as ColorBucketId);
    return index;
  };

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

const tripIndex = new Map<ColorBucketId, { trip: string; count: number }[]>();

/** Which trips a family comes from, most first — the answer to "where in
 *  the world is this colour", which is the question the colour pages exist
 *  to make askable. Ties break on the trip name so the list is stable.
 *
 *  Derived from the key rather than from any trip metadata, because the key
 *  is what the bake script and the gallery routes already agree on:
 *  "assets/photography/<trip>/<file>". */
export function tripsForBucket(id: ColorBucketId): { trip: string; count: number }[] {
  const cached = tripIndex.get(id);
  if (cached) return cached;
  const tally = new Map<string, number>();
  for (const src of keys()) {
    if (!entries[src].buckets.includes(id)) continue;
    const trip = src.split("/")[2];
    if (!trip) continue;
    tally.set(trip, (tally.get(trip) ?? 0) + 1);
  }
  const rows = [...tally]
    .map(([trip, count]) => ({ trip, count }))
    .sort((a, b) => b.count - a.count || a.trip.localeCompare(b.trip));
  tripIndex.set(id, rows);
  return rows;
}

/** The baked row for one photo, or null when it was never classified — a
 *  photo added since the last bake, or one sharp could not decode. Callers
 *  treat null as "no colour information", never as "no colour". */
export function entryFor(src: string): PhotoColorEntry | null {
  return entries[src] ?? null;
}
