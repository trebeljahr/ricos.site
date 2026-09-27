/**
 * Bake colour families over the photography corpus.
 *
 * Reads every `assets/photography/**` key out of the Notes submodule's
 * metadata.json, decodes the original at 64px on the long edge, histograms
 * its pixels, classifies them with src/lib/colorBuckets.mjs, and merges the
 * result into src/content/photography-colors.json.
 *
 * That JSON is committed, and this script is incremental by default: it
 * only touches keys the JSON does not already have. So CI and Vercel do
 * zero image work on a normal build, and adding one trip costs one trip's
 * worth of decoding rather than the whole archive's. `--force` redoes
 * everything, which is what a changed tuning constant needs.
 *
 * Usage:
 *   npm run photographyColors                  # incremental bake
 *   npm run photographyColors -- --force       # re-classify everything
 *   npm run photographyColors -- --measure-priors
 *   npm run photographyColors -- --dump-histograms=/tmp/hist.json
 *
 * Never writes inside src/content/Notes/ — that is a submodule, and this
 * script is a pure reader of it.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { argv, cwd, exit } from "node:process";
import pLimit from "p-limit";
import sharp from "sharp";
import {
  CHROMA_FULL_WEIGHT,
  CHROMATIC_FAMILIES,
  type ColorBucketId,
  colorProfileFromHistogram,
  FAMILY_PRIOR,
  familyForOklch,
  familyVoteShares,
  rgbToOklch,
} from "src/lib/colorBuckets.mjs";

const METADATA_PATH = resolve(cwd(), "src/content/Notes/_data/metadata.json");
const ASSETS_ROOT = resolve(cwd(), "src/content/Notes");
const OUT_PATH = resolve(cwd(), "src/content/photography-colors.json");
const PHOTOGRAPHY_PREFIX = "assets/photography/";

/** 64px on the long edge is ~4,000 pixels collapsing into at most a few
 *  hundred 5-bit histogram bins — far more than enough to characterise a
 *  palette, and cheap because sharp asks libjpeg for a shrink-on-load, so
 *  most of the DCT is never inverse-transformed. */
const COLOR_SAMPLE_PX = 64;

/** Strength and chroma are fractions of the whole image.
 *
 *  This was 1000 — three decimals — on the reasoning that 0.001 is one pixel
 *  in a thousand and finer than a 64px decode resolves. That reasoning was
 *  about the measurement and ignored what the number is used for. Strength
 *  ranks the family pages, and at three decimals a family's values collide
 *  constantly: 49% of adjacent pairs in blue and 64% in red came out exactly
 *  equal, so half the page fell through to a tiebreak and the colour ordering
 *  stopped meaning anything a few rows in.
 *
 *  Five decimals costs about 2 bytes per family per row — roughly 15 KB
 *  across the whole file — and makes an exact collision rare enough that the
 *  ordering is decided by the measurement almost everywhere. The 64px decode
 *  genuinely cannot resolve a difference that fine, so the extra digits are
 *  not more accurate; they are a deterministic way of not throwing away the
 *  ordering the vote already computed. The tiebreaks in
 *  src/lib/photographyColors.ts stay as the backstop. */
const STRENGTH_PRECISION = 100000;
const LIGHTNESS_PRECISION = 1000;
/** Hue to one decimal: 0.1° is far below the angular resolution of a
 *  64px quantized histogram, and the spectrum page only needs a stable
 *  total order. */
const HUE_PRECISION = 10;

/** libvips spawns a thread per image by default, so a pool of workers each
 *  decoding in parallel oversubscribes the machine badly and ends up
 *  slower than one-at-a-time. One libvips thread per decode, N decodes in
 *  flight, is the combination that actually keeps all cores busy. */
const DECODE_CONCURRENCY = 8;

/** The stratified sample FAMILY_PRIOR is fitted over: the first N keys of
 *  each trip, in metadata.json order. Stratifying matters because the trip
 *  sizes are wildly uneven — best-of has 572 photos and spain-2024 has 37
 *  — so an unstratified sample would fit the priors to whichever trips
 *  happen to be large, and the Caribbean folders alone would push the
 *  teal prior up by half. Taking a fixed head per trip rather than a
 *  random draw keeps the measurement reproducible without a seeded RNG. */
const PRIOR_SAMPLE_PER_TRIP = 40;

/** Recorded in the JSON so a reader can tell how old the normalisation is
 *  without going through git. Bump it when FAMILY_PRIOR is re-measured. */
const PRIORS_MEASURED_ON = "2026-09-27";

type MetadataEntry = { key: string; width: number; height: number; alt?: string };

export type BakedEntry = {
  buckets: ColorBucketId[];
  strength: Partial<Record<ColorBucketId, number>>;
  hue: number | null;
  lightness: number;
  chroma: number;
};

type BakedFile = {
  version: number;
  measuredOn: string;
  sample: { images: number; trips: number };
  priors: Record<string, number>;
  images: Record<string, BakedEntry>;
};

type HistogramEntry = { r: number; g: number; b: number; count: number };

function flag(name: string): boolean {
  return argv.includes(`--${name}`);
}

function flagValue(name: string): string | null {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function readMetadata(): Promise<Record<string, MetadataEntry | undefined>> {
  return JSON.parse(await readFile(METADATA_PATH, "utf-8"));
}

function tripOf(key: string): string {
  return key.slice(PHOTOGRAPHY_PREFIX.length).split("/")[0] ?? "";
}

/** Photography keys in metadata.json order. Order is load-bearing for the
 *  prior sample (see PRIOR_SAMPLE_PER_TRIP) and irrelevant everywhere
 *  else, since the runtime sorts by strength or hue. */
function photographyKeys(metadata: Record<string, MetadataEntry | undefined>): string[] {
  return Object.keys(metadata).filter(
    (key) => key.startsWith(PHOTOGRAPHY_PREFIX) && metadata[key] !== undefined,
  );
}

function stratifiedSample(keys: string[]): string[] {
  const perTrip = new Map<string, string[]>();
  for (const key of keys) {
    const trip = tripOf(key);
    const list = perTrip.get(trip) ?? [];
    if (list.length < PRIOR_SAMPLE_PER_TRIP) list.push(key);
    perTrip.set(trip, list);
  }
  return [...perTrip.values()].flat();
}

/** Decode one image into a 5-bit-per-channel histogram. Returns null when
 *  the file is missing or sharp cannot read it — the caller leaves such a
 *  key unclassified rather than baking a wrong answer, and the next run
 *  retries it for free because it is still absent from the JSON. */
async function histogramFor(key: string): Promise<HistogramEntry[] | null> {
  const source = resolve(ASSETS_ROOT, key);
  if (!existsSync(source)) return null;
  try {
    const { data, info } = await sharp(source)
      .resize(COLOR_SAMPLE_PX, COLOR_SAMPLE_PX, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels < 3) return null;
    const stride = info.channels;
    const pixels = info.width * info.height;
    const bins = new Map<number, number>();
    for (let i = 0; i < pixels; i++) {
      const at = i * stride;
      const bin = ((data[at] >> 3) << 10) | ((data[at + 1] >> 3) << 5) | (data[at + 2] >> 3);
      bins.set(bin, (bins.get(bin) ?? 0) + 1);
    }
    // Re-expand each bin to the centre of the 8-value range it covers, so
    // quantization doesn't bias every channel downwards by ~4/255 — which
    // would darken every measured lightness and drag warm pixels across
    // the earth split.
    const entries: HistogramEntry[] = [];
    for (const [bin, count] of bins) {
      entries.push({
        r: (((bin >> 10) & 31) << 3) | 4,
        g: (((bin >> 5) & 31) << 3) | 4,
        b: ((bin & 31) << 3) | 4,
        count,
      });
    }
    return entries;
  } catch {
    return null;
  }
}

function round(value: number, precision: number): number {
  return Math.round(value * precision) / precision;
}

function bakedEntryFor(entries: HistogramEntry[]): BakedEntry | null {
  const profile = colorProfileFromHistogram(entries);
  if (profile.buckets.length === 0) return null;
  const strength: Partial<Record<ColorBucketId, number>> = {};
  for (const [id, value] of Object.entries(profile.strength)) {
    strength[id as ColorBucketId] = round(value, STRENGTH_PRECISION);
  }
  return {
    buckets: profile.buckets,
    strength,
    hue: profile.hue === null ? null : round(profile.hue, HUE_PRECISION),
    lightness: round(profile.lightness, LIGHTNESS_PRECISION),
    chroma: round(profile.chroma, STRENGTH_PRECISION),
  };
}

/** Walk `keys` with bounded concurrency, reporting progress on one line so
 *  a 4,900-image pass is watchable without scrolling a terminal. */
async function forEachHistogram(
  keys: string[],
  onResult: (key: string, entries: HistogramEntry[] | null) => void,
  label: string,
): Promise<{ failed: string[] }> {
  sharp.concurrency(1);
  const limit = pLimit(DECODE_CONCURRENCY);
  const failed: string[] = [];
  let done = 0;
  const started = Date.now();
  await Promise.all(
    keys.map((key) =>
      limit(async () => {
        const entries = await histogramFor(key);
        if (entries === null) failed.push(key);
        onResult(key, entries);
        done += 1;
        if (done % 100 === 0 || done === keys.length) {
          const perSec = done / Math.max(1, (Date.now() - started) / 1000);
          process.stdout.write(
            `\r[photographyColors] ${label} ${done}/${keys.length} (${perSec.toFixed(1)}/s)   `,
          );
        }
      }),
    ),
  );
  process.stdout.write("\n");
  return { failed };
}

async function measurePriors(keys: string[]): Promise<void> {
  const sample = stratifiedSample(keys);
  const trips = new Set(sample.map(tripOf));
  console.log(
    `[photographyColors] measuring priors over ${sample.length} photos from ${trips.size} trips ` +
      `(up to ${PRIOR_SAMPLE_PER_TRIP} per trip)`,
  );

  const shareSums = new Map<string, number>();
  // Representative colour per family: the mean lightness, mean chroma and
  // circular mean hue of the pixels that voted for it, accumulated across
  // the whole sample. This is what the swatch values in colorBuckets.mjs
  // are picked from, so the wheel shows this archive's greens rather than
  // a web primary.
  const rep = new Map<string, { l: number; c: number; x: number; y: number; w: number }>();
  let counted = 0;

  await forEachHistogram(
    sample,
    (_key, entries) => {
      if (!entries) return;
      const shares = familyVoteShares(entries);
      if (Object.keys(shares).length === 0) return;
      counted += 1;
      for (const [id, share] of Object.entries(shares)) {
        shareSums.set(id, (shareSums.get(id) ?? 0) + share);
      }
      for (const bin of entries) {
        const sample = rgbToOklch(bin.r, bin.g, bin.b);
        const family = familyForOklch(sample);
        if (!family) continue;
        const weight = bin.count * Math.min(1, sample.c / CHROMA_FULL_WEIGHT);
        const acc = rep.get(family) ?? { l: 0, c: 0, x: 0, y: 0, w: 0 };
        const rad = (sample.h * Math.PI) / 180;
        acc.l += sample.l * weight;
        acc.c += sample.c * weight;
        acc.x += Math.cos(rad) * weight;
        acc.y += Math.sin(rad) * weight;
        acc.w += weight;
        rep.set(family, acc);
      }
    },
    "priors",
  );

  console.log(`\n  family      prior   (mean share of the chromatic vote, n=${counted})`);
  const measured: Record<string, number> = {};
  for (const id of CHROMATIC_FAMILIES) {
    const value = (shareSums.get(id) ?? 0) / Math.max(1, counted);
    measured[id] = round(value, STRENGTH_PRECISION);
    const current = FAMILY_PRIOR[id] ?? 0;
    const delta = current === 0 ? "" : `  (in code: ${current.toFixed(3)})`;
    console.log(`  ${id.padEnd(10)} ${measured[id].toFixed(3)}${delta}`);
  }
  const total = Object.values(measured).reduce((sum, v) => sum + v, 0);
  console.log(`  ${"sum".padEnd(10)} ${total.toFixed(3)}`);
  console.log(`\n  paste into FAMILY_PRIOR:\n${JSON.stringify(measured, null, 2)}`);

  // The measured centre of each family, printed as OKLCh so the swatch
  // values in colorBuckets.mjs can be taken from the corpus instead of
  // invented. Not written anywhere automatically: a swatch is a design
  // decision, and the mean of a family that spans dawn to dusk needs a
  // human to look at it before it goes in the wheel.
  console.log("\n  measured family centres (OKLCh, chroma-weighted):");
  for (const id of CHROMATIC_FAMILIES) {
    const acc = rep.get(id);
    if (!acc || acc.w === 0) continue;
    const hue = ((((Math.atan2(acc.y, acc.x) * 180) / Math.PI) % 360) + 360) % 360;
    console.log(
      `  ${id.padEnd(10)} L ${(acc.l / acc.w).toFixed(3)}  C ${(acc.c / acc.w).toFixed(3)}  H ${hue.toFixed(1)}  ` +
        `oklch(${((acc.l / acc.w) * 100).toFixed(1)}% ${(acc.c / acc.w).toFixed(3)} ${hue.toFixed(1)})`,
    );
  }
}

async function main(): Promise<void> {
  const metadata = await readMetadata();
  const keys = photographyKeys(metadata);
  if (keys.length === 0) {
    console.log("[photographyColors] no photography keys in metadata.json — nothing to do");
    return;
  }

  if (flag("measure-priors")) {
    await measurePriors(keys);
    return;
  }

  const force = flag("force");
  const dumpTo = flagValue("dump-histograms");

  let existing: BakedFile | null = null;
  if (existsSync(OUT_PATH)) {
    existing = JSON.parse(await readFile(OUT_PATH, "utf-8")) as BakedFile;
  }
  const images: Record<string, BakedEntry> = {};
  // Keep only keys metadata still knows about: a deleted photo should not
  // keep inflating a bucket count forever.
  if (existing && !force) {
    for (const key of keys) {
      const entry = existing.images?.[key];
      if (entry) images[key] = entry;
    }
  }

  console.log(
    `[photographyColors] ${keys.length} photography keys, ${Object.keys(images).length} already baked, ` +
      `${keys.length - Object.keys(images).length} to classify`,
  );
  const todo = keys.filter((key) => !(key in images));

  // `--dump-histograms` exists so a tuning constant can be re-fitted
  // without decoding 4,900 originals again: the histogram is the only
  // input the classifier reads, so a dump of it lets a sweep over, say,
  // BROWN_MAX_LIGHTNESS run in seconds. Stored as flat r,g,b,count
  // quadruples rather than objects because the object form of the whole
  // corpus does not fit comfortably in a Node heap.
  const dumped: Record<string, number[]> = {};
  if (todo.length > 0) {
    const { failed } = await forEachHistogram(
      todo,
      (key, entries) => {
        if (!entries) return;
        if (dumpTo) {
          const flat: number[] = [];
          for (const bin of entries) flat.push(bin.r, bin.g, bin.b, bin.count);
          dumped[key] = flat;
        }
        const baked = bakedEntryFor(entries);
        if (baked) images[key] = baked;
      },
      force ? "re-bake" : "bake",
    );
    if (failed.length > 0) {
      console.log(
        `[photographyColors] ${failed.length} image(s) could not be decoded and stay unclassified ` +
          "(they will be retried next run):",
      );
      for (const key of failed.slice(0, 20)) console.log(`  ${key}`);
      if (failed.length > 20) console.log(`  … and ${failed.length - 20} more`);
    }
  }

  if (dumpTo) {
    await mkdir(dirname(dumpTo), { recursive: true });
    await writeFile(dumpTo, JSON.stringify(dumped));
    console.log(
      `[photographyColors] histograms for ${Object.keys(dumped).length} keys -> ${dumpTo}`,
    );
  }

  const sample = stratifiedSample(keys);
  const out: BakedFile = {
    version: 1,
    measuredOn: PRIORS_MEASURED_ON,
    sample: { images: sample.length, trips: new Set(sample.map(tripOf)).size },
    priors: { ...FAMILY_PRIOR },
    images: Object.fromEntries(
      Object.keys(images)
        .sort()
        .map((key) => [key, images[key]]),
    ),
  };
  await writeFile(OUT_PATH, `${JSON.stringify(out, null, 0)}\n`);

  // Distribution report: the one number that tells you whether the tuning
  // is sane. A family holding a third of the archive is a family nobody
  // can browse.
  const counts = new Map<string, number>();
  let achromatic = 0;
  for (const entry of Object.values(images)) {
    for (const id of new Set(entry.buckets)) counts.set(id, (counts.get(id) ?? 0) + 1);
    if (entry.hue === null) achromatic += 1;
  }
  const total = Object.keys(images).length;
  console.log(`[photographyColors] baked ${total} photos -> ${OUT_PATH}`);
  for (const [id, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(
      `  ${id.padEnd(8)} ${String(count).padStart(5)}  ${((count / total) * 100).toFixed(1)}%`,
    );
  }
  console.log(
    `  ${"(no hue)".padEnd(8)} ${String(achromatic).padStart(5)}  ${((achromatic / total) * 100).toFixed(1)}%`,
  );
}

main().catch((error) => {
  console.error("[photographyColors] failed:", error);
  exit(1);
});
