/**
 * Pure geometry for the photo globe: rounding, outlier rejection, centroids and the
 * merge of measured EXIF positions with the hand-authored fallback table.
 *
 * Kept free of file IO so `geoMath.test.ts` can pin the tricky cases — the sign-flipped
 * drone longitudes, the airport layovers and the thin-coverage folders that must fall
 * back to a manual pin.
 */
import type { TripCentroid } from "../../content/tripCentroids";
import type { GeoBoundingBox, GeoPointTuple, TripLocation } from "../../lib/photoGeo";

export type GeoPoint = { lat: number; lng: number };

/** Shipped precision. 2 decimals is ~1.1 km — enough for a globe, coarse enough for home. */
export const COORD_DECIMALS = 2;

/**
 * A point further than this from the folder's median, on either axis in degrees, is
 * rejected. It catches the three DJI files whose missing GPSLongitudeRef mirrors
 * Colombia into the Indian Ocean (+74.37 against a median of -74.3) and the two Paris
 * layover frames in india-2023 (lng 2.6 against a median of 76.7).
 *
 * The threshold is deliberately loose. At 15 degrees it also deleted the 20 genuine
 * Kerala frames from india-2023, which really does run Ladakh to Kochi, and pulled that
 * trip's centroid 200 km north. Both real failure modes are off by 70 degrees or more,
 * so there is no reason to cut closer than this.
 *
 * Skipped for tracks and collections, whose points are supposed to be far apart.
 */
export const OUTLIER_DEGREES = 25;

/**
 * Below this share of photos carrying GPS, the EXIF centroid stops meaning anything.
 * germany sits at 14% across three disjoint clusters and its mean is an empty field near
 * Halle; every other folder with GPS is above 60%.
 */
export const MIN_GPS_COVERAGE = 0.25;

/** Round to the shipped precision, without ever emitting `-0`. */
export function roundCoord(value: number, decimals = COORD_DECIMALS): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Reject anything implausibly far from the folder's median position. */
export function rejectOutliers(
  points: GeoPoint[],
  maxDegrees = OUTLIER_DEGREES,
): { kept: GeoPoint[]; dropped: GeoPoint[] } {
  if (points.length < 3) return { kept: [...points], dropped: [] };

  const midLat = median(points.map((p) => p.lat));
  const midLng = median(points.map((p) => p.lng));

  const kept: GeoPoint[] = [];
  const dropped: GeoPoint[] = [];
  for (const point of points) {
    const far =
      Math.abs(point.lat - midLat) > maxDegrees || Math.abs(point.lng - midLng) > maxDegrees;
    (far ? dropped : kept).push(point);
  }
  return { kept, dropped };
}

/** Arithmetic mean. Safe here because no trip crosses the antimeridian. */
export function centroidOf(points: GeoPoint[]): GeoPoint | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

export function boundingBoxOf(points: GeoPoint[]): GeoBoundingBox | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return [
    roundCoord(Math.min(...lngs)),
    roundCoord(Math.min(...lats)),
    roundCoord(Math.max(...lngs)),
    roundCoord(Math.max(...lats)),
  ];
}

/**
 * Round to 2 decimals and drop repeats, preserving the incoming order — the transat
 * polyline depends on its points staying chronological, so nothing here may sort.
 */
export function dedupeRoundedPoints(points: GeoPoint[]): GeoPointTuple[] {
  const seen = new Set<string>();
  const out: GeoPointTuple[] = [];
  for (const point of points) {
    const lat = roundCoord(point.lat);
    const lng = roundCoord(point.lng);
    const key = `${lat},${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([lat, lng]);
  }
  return out;
}

export type TripGeoInput = {
  centroid: TripCentroid;
  /** Every image file in the folder, GPS or not. */
  photoCount: number;
  /** Real EXIF positions in capture order. Unrounded and unfiltered. */
  gpsPoints: GeoPoint[];
};

/** Merge one folder's measured points with its hand-authored entry. */
export function buildTripLocation({ centroid, photoCount, gpsPoints }: TripGeoInput): TripLocation {
  const skipGuard = centroid.track === true || centroid.kind === "collection";
  const { kept } = skipGuard ? { kept: gpsPoints } : rejectOutliers(gpsPoints);

  const coverage = photoCount > 0 ? gpsPoints.length / photoCount : 0;
  const measured = centroidOf(kept);
  const useExif = !centroid.forceManual && measured !== null && coverage >= MIN_GPS_COVERAGE;

  const trip: TripLocation = {
    name: centroid.name,
    label: centroid.label,
    region: centroid.region,
    lat: useExif ? roundCoord(measured.lat) : roundCoord(centroid.lat),
    lng: useExif ? roundCoord(measured.lng) : roundCoord(centroid.lng),
    source: useExif ? "exif" : "manual",
    photoCount,
    gpsCount: gpsPoints.length,
    bbox: useExif ? boundingBoxOf(kept) : null,
    // `forceManual` has to hide the point cloud too, not only the pin. Germany is the case
    // that matters: its 35 GPS frames are Berlin, Cologne and home, and a dot cloud there
    // says more about where Rico lives than the coarse pin it was forced to.
    points: centroid.forceManual ? [] : dedupeRoundedPoints(kept),
  };

  if (centroid.kind) trip.kind = centroid.kind;
  if (centroid.track) trip.track = true;
  return trip;
}
