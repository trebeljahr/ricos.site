/**
 * Build `src/content/photo-locations.json` — the per-trip marker positions the photo
 * globe renders.
 *
 * Reads EXIF GPS straight off the JPEGs under `src/content/Notes/assets/photography`,
 * folds each folder into a centroid, a bbox and a deduped point cloud, and merges in the
 * hand-authored table from `src/content/tripCentroids.ts` for the folders whose cameras
 * never wrote GPS (only 1666 of 4900 photos have any).
 *
 *   pnpm run extractPhotoGeodata
 *
 * Notes for whoever touches this next:
 *   - `exifr.gps()`, never `exifr.parse({ pick: [...] })`. The pick path ignores
 *     GPSLongitudeRef and returns +61.54 for a Caribbean photo that sits at -61.54,
 *     which mirrors half the map into the Indian Ocean.
 *   - Pass a Buffer, never a path. `exifr.gps("/abs/path.jpg")` throws
 *     `The "options" argument must be of type object` on current Node.
 *   - WEBP is skipped on purpose: exifr has no RIFF container reader, and none of the
 *     cameras that produced the webp files ever wrote GPS anyway (0 of 3054).
 *   - Nothing is ever written under `src/content/Notes` — that path is a git submodule.
 *
 * PRIVACY: every shipped coordinate is rounded to 2 decimals (~1.1 km) and no filename
 * is shipped next to a coordinate. The germany folder is home; keep it that way.
 */
import { open, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";
import { Presets, SingleBar } from "cli-progress";
import exifr from "exifr";
import pLimit from "p-limit";
import { TRIP_CENTROIDS, TRIP_CENTROIDS_BY_NAME } from "../../content/tripCentroids";
import type { PhotoGeoData, TripLocation } from "../../lib/photoGeo";
import { buildTripLocation, type GeoPoint, OUTLIER_DEGREES, rejectOutliers } from "./geoMath";

const PHOTOGRAPHY_ROOT = resolve(cwd(), "src/content/Notes/assets/photography");
const OUTPUT_PATH = resolve(cwd(), "src/content/photo-locations.json");

const IMAGE_RE = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
/** exifr cannot open a RIFF container, and those cameras never wrote GPS regardless. */
const EXIF_READABLE_RE = /\.(jpg|jpeg|png|tif|tiff)$/i;

/** EXIF lives in the first APP1 segment, so a head slice is enough for almost every file. */
const HEAD_BYTES = 128 * 1024;

const CONCURRENCY = 16;

type FileGeo = { file: string; lat: number; lng: number; takenAt: number | null };

/** Read only the head of the file — full reads of 1800 raw JPEGs cost gigabytes of IO. */
async function readHead(path: string, bytes: number): Promise<Buffer> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function readGps(path: string): Promise<{ lat: number; lng: number } | null> {
  // Head slice first, whole file as a fallback for the rare photo with a fat thumbnail
  // ahead of its APP1 segment.
  for (const headBytes of [HEAD_BYTES, 0]) {
    try {
      const buffer = headBytes > 0 ? await readHead(path, headBytes) : await readFile(path);
      const gps = await exifr.gps(buffer);
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
        return { lat: gps.latitude, lng: gps.longitude };
      }
    } catch {
      // Truncated head, unsupported container or broken EXIF — fall through and give up.
    }
  }
  return null;
}

/** Only tracks need this: their points must stay in capture order, not filename order. */
async function readTakenAt(path: string): Promise<number | null> {
  try {
    const buffer = await readHead(path, HEAD_BYTES);
    const parsed = await exifr.parse(buffer, ["DateTimeOriginal"]);
    const value = parsed?.DateTimeOriginal;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
  } catch {
    // No date is fine — the fallback is filename order, which is chronological here anyway.
  }
  return null;
}

async function listTripFolders(): Promise<string[]> {
  const entries = await readdir(PHOTOGRAPHY_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function main() {
  const folders = await listTripFolders();

  const jobs: { trip: string; file: string; path: string; needsDate: boolean }[] = [];
  const photoCounts = new Map<string, number>();
  const emptyFolders: string[] = [];
  const unknownFolders: string[] = [];

  for (const trip of folders) {
    const files = (await readdir(join(PHOTOGRAPHY_ROOT, trip)))
      .filter((f) => IMAGE_RE.test(f))
      .sort();
    photoCounts.set(trip, files.length);
    if (files.length === 0) {
      emptyFolders.push(trip);
      continue;
    }
    const centroid = TRIP_CENTROIDS_BY_NAME[trip];
    if (!centroid) {
      unknownFolders.push(trip);
      continue;
    }
    for (const file of files) {
      if (!EXIF_READABLE_RE.test(file)) continue;
      jobs.push({
        trip,
        file,
        path: join(PHOTOGRAPHY_ROOT, trip, file),
        needsDate: centroid.track === true,
      });
    }
  }

  if (unknownFolders.length > 0) {
    throw new Error(
      `No entry in src/content/tripCentroids.ts for: ${unknownFolders.join(", ")}. ` +
        "Add one (label, region, manual lat/lng, note) before regenerating.",
    );
  }

  const bar = new SingleBar(
    { format: "EXIF {bar} {percentage}% | {value}/{total} | {trip}" },
    Presets.shades_classic,
  );
  bar.start(jobs.length, 0, { trip: "" });

  const limit = pLimit(CONCURRENCY);
  const byTrip = new Map<string, FileGeo[]>();

  await Promise.all(
    jobs.map((job) =>
      limit(async () => {
        const gps = await readGps(job.path);
        if (gps) {
          const takenAt = job.needsDate ? await readTakenAt(job.path) : null;
          const list = byTrip.get(job.trip) ?? [];
          list.push({ file: job.file, lat: gps.lat, lng: gps.lng, takenAt });
          byTrip.set(job.trip, list);
        }
        bar.increment(1, { trip: job.trip });
      }),
    ),
  );
  bar.stop();

  const trips: TripLocation[] = [];
  const droppedReport: string[] = [];

  for (const centroid of TRIP_CENTROIDS) {
    const photoCount = photoCounts.get(centroid.name);
    if (photoCount === undefined) {
      throw new Error(`tripCentroids.ts lists "${centroid.name}" but no such folder exists.`);
    }

    const found = byTrip.get(centroid.name) ?? [];
    // Deterministic order: capture time for tracks, filename otherwise.
    found.sort((a, b) =>
      centroid.track && a.takenAt !== null && b.takenAt !== null
        ? a.takenAt - b.takenAt
        : a.file.localeCompare(b.file),
    );
    const gpsPoints: GeoPoint[] = found.map(({ lat, lng }) => ({ lat, lng }));

    if (!centroid.track && centroid.kind !== "collection") {
      const { dropped } = rejectOutliers(gpsPoints);
      if (dropped.length > 0) {
        droppedReport.push(
          `  ${centroid.name}: dropped ${dropped.length} point(s) >${OUTLIER_DEGREES}deg from the folder median`,
        );
      }
    }

    trips.push(buildTripLocation({ centroid, photoCount, gpsPoints }));
  }

  const data: PhotoGeoData = {
    trips,
    totals: {
      photos: [...photoCounts.values()].reduce((sum, n) => sum + n, 0),
      withExifGps: trips.reduce((sum, trip) => sum + trip.gpsCount, 0),
      trips: trips.length,
    },
  };

  await writeFile(OUTPUT_PATH, `${stringifyWithInlineCoords(data)}\n`, "utf-8");

  console.log("\nphoto-locations.json written to src/content/photo-locations.json");
  console.table(
    trips.map((trip) => ({
      trip: trip.name,
      photos: trip.photoCount,
      gps: trip.gpsCount,
      points: trip.points.length,
      source: trip.source,
      lat: trip.lat,
      lng: trip.lng,
    })),
  );
  if (emptyFolders.length > 0) console.log(`Empty folders skipped: ${emptyFolders.join(", ")}`);
  if (droppedReport.length > 0) console.log(`Outliers rejected:\n${droppedReport.join("\n")}`);
  console.log(
    `Totals: ${data.totals.photos} photos, ${data.totals.withExifGps} with EXIF GPS, ${data.totals.trips} trips.`,
  );
}

/** Pretty JSON, except coordinate pairs and bboxes stay on one line so diffs stay readable. */
function stringifyWithInlineCoords(data: PhotoGeoData): string {
  return JSON.stringify(data, null, 2).replace(
    /\[\s*\n\s*(-?\d+(?:\.\d+)?(?:,\s*\n\s*-?\d+(?:\.\d+)?)*)\n\s*\]/g,
    (_match, numbers: string) => `[${numbers.replace(/\s*\n\s*/g, " ")}]`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
