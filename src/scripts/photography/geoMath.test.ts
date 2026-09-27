import { describe, expect, it } from "vitest";
import type { TripCentroid } from "../../content/tripCentroids";
import { TRIP_CENTROIDS } from "../../content/tripCentroids";
import {
  boundingBoxOf,
  buildTripLocation,
  centroidOf,
  dedupeRoundedPoints,
  type GeoPoint,
  median,
  rejectOutliers,
  roundCoord,
} from "./geoMath";

function centroidFixture(overrides: Partial<TripCentroid> = {}): TripCentroid {
  return {
    name: "testtrip",
    label: "Test Trip",
    region: "Europe",
    lat: 10,
    lng: 20,
    note: "fixture",
    ...overrides,
  };
}

/** A tight cloud of plausible points so the median guard has something to anchor on. */
function cloud(count: number, lat: number, lng: number): GeoPoint[] {
  return Array.from({ length: count }, (_, i) => ({ lat: lat + i * 0.01, lng: lng + i * 0.01 }));
}

describe("roundCoord", () => {
  it("rounds to 2 decimals", () => {
    expect(roundCoord(15.369912345)).toBe(15.37);
    expect(roundCoord(-61.34051)).toBe(-61.34);
  });

  it("never emits negative zero, which JSON.stringify writes as -0", () => {
    expect(Object.is(roundCoord(-0.001), 0)).toBe(true);
    expect(JSON.stringify(roundCoord(-0.001))).toBe("0");
  });
});

describe("median", () => {
  it("takes the middle of an odd list and the mean of the middle pair of an even one", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("rejectOutliers", () => {
  it("drops a sign-flipped longitude like the DJI files with no GPSLongitudeRef", () => {
    const points = [...cloud(10, 4.6, -74.3), { lat: 4.66, lng: 74.37 }];
    const { kept, dropped } = rejectOutliers(points);
    expect(dropped).toEqual([{ lat: 4.66, lng: 74.37 }]);
    expect(kept).toHaveLength(10);
  });

  it("drops an airport layover far from the rest of the trip", () => {
    const points = [...cloud(10, 29.8, 76.5), { lat: 49.005, lng: 2.578 }];
    const { dropped } = rejectOutliers(points);
    expect(dropped).toEqual([{ lat: 49.005, lng: 2.578 }]);
  });

  it("keeps a genuinely spread trip — Ladakh and Kerala are one trip, not an error", () => {
    const points = [...cloud(10, 34.6, 77.5), ...cloud(10, 10.3, 76.2)];
    const { dropped } = rejectOutliers(points);
    expect(dropped).toEqual([]);
  });

  it("cannot judge fewer than three points, so it keeps them all", () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 80, lng: 170 },
    ];
    expect(rejectOutliers(points).dropped).toEqual([]);
  });
});

describe("centroidOf / boundingBoxOf", () => {
  it("averages the points", () => {
    expect(
      centroidOf([
        { lat: 10, lng: 20 },
        { lat: 20, lng: 40 },
      ]),
    ).toEqual({ lat: 15, lng: 30 });
  });

  it("returns null for an empty cloud", () => {
    expect(centroidOf([])).toBeNull();
    expect(boundingBoxOf([])).toBeNull();
  });

  it("emits a bbox in GeoJSON order: minLng, minLat, maxLng, maxLat", () => {
    const points = [
      { lat: 14.6, lng: -61.2 },
      { lat: 14.87, lng: -60.99 },
    ];
    expect(boundingBoxOf(points)).toEqual([-61.2, 14.6, -60.99, 14.87]);
  });
});

describe("dedupeRoundedPoints", () => {
  it("collapses points that land on the same rounded cell", () => {
    const points = [
      { lat: 15.371, lng: -61.344 },
      { lat: 15.3705, lng: -61.3441 },
      { lat: 15.42, lng: -61.31 },
    ];
    expect(dedupeRoundedPoints(points)).toEqual([
      [15.37, -61.34],
      [15.42, -61.31],
    ]);
  });

  it("preserves order, because the transat polyline has to stay chronological", () => {
    const points = [
      { lat: 35.78, lng: -5.8 },
      { lat: 28.96, lng: -13.55 },
      { lat: 16.13, lng: -60.01 },
    ];
    expect(dedupeRoundedPoints(points)).toEqual([
      [35.78, -5.8],
      [28.96, -13.55],
      [16.13, -60.01],
    ]);
  });
});

describe("buildTripLocation", () => {
  it("prefers the EXIF centroid when coverage is good", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture({ name: "dominica", lat: 15.41, lng: -61.37 }),
      photoCount: 2,
      gpsPoints: [
        { lat: 15.3, lng: -61.3 },
        { lat: 15.5, lng: -61.5 },
      ],
    });
    expect(trip.source).toBe("exif");
    expect([trip.lat, trip.lng]).toEqual([15.4, -61.4]);
    expect(trip.bbox).toEqual([-61.5, 15.3, -61.3, 15.5]);
  });

  it("falls back to the manual pin when GPS covers under a quarter of the folder", () => {
    // germany: 35 of 254 photos, three disjoint clusters whose mean is an empty field.
    const trip = buildTripLocation({
      centroid: centroidFixture({ name: "germany", lat: 52.52, lng: 13.4 }),
      photoCount: 254,
      gpsPoints: cloud(35, 51.0, 11.0),
    });
    expect(trip.source).toBe("manual");
    expect([trip.lat, trip.lng]).toEqual([52.52, 13.4]);
    expect(trip.bbox).toBeNull();
    // The measured points still ship — only the marker is overridden.
    expect(trip.gpsCount).toBe(35);
    expect(trip.points.length).toBeGreaterThan(0);
  });

  it("honours forceManual even when coverage is total", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture({ forceManual: true }),
      photoCount: 4,
      gpsPoints: cloud(4, 40, 40),
    });
    expect(trip.source).toBe("manual");
    expect(trip.bbox).toBeNull();
  });

  it("falls back to manual when the folder has no GPS at all", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture({ lat: 19.9, lng: 102.2 }),
      photoCount: 297,
      gpsPoints: [],
    });
    expect(trip).toMatchObject({ source: "manual", gpsCount: 0, bbox: null, points: [] });
  });

  it("excludes rejected outliers from the centroid but still counts them in gpsCount", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture(),
      photoCount: 11,
      gpsPoints: [...cloud(10, 4.6, -74.3), { lat: 4.66, lng: 74.37 }],
    });
    expect(trip.gpsCount).toBe(11);
    // 10 kept points survive; the mirrored one is gone from both the cloud and the pin.
    expect(trip.points).toHaveLength(10);
    expect(trip.points.every(([, lng]) => lng < 0)).toBe(true);
    expect(trip.lng).toBeLessThan(0);
  });

  it("exempts a track from the outlier guard and keeps every leg", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture({ name: "transat", track: true }),
      photoCount: 4,
      gpsPoints: [
        { lat: 35.78, lng: -5.8 },
        { lat: 28.96, lng: -13.55 },
        { lat: 19.0, lng: -35.0 },
        { lat: 13.8, lng: -60.0 },
      ],
    });
    expect(trip.track).toBe(true);
    expect(trip.points).toHaveLength(4);
  });

  it("exempts a collection from the guard and tags it so no pin is drawn", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture({ name: "best-of", kind: "collection" }),
      photoCount: 4,
      gpsPoints: [
        { lat: 52.5, lng: 13.4 },
        { lat: 4.3, lng: -74.4 },
        { lat: 15.4, lng: -61.3 },
        { lat: 28.6, lng: 77.2 },
      ],
    });
    expect(trip.kind).toBe("collection");
    expect(trip.points).toHaveLength(4);
  });

  it("leaves kind and track off an ordinary trip", () => {
    const trip = buildTripLocation({
      centroid: centroidFixture(),
      photoCount: 1,
      gpsPoints: [],
    });
    expect("kind" in trip).toBe(false);
    expect("track" in trip).toBe(false);
  });
});

describe("TRIP_CENTROIDS", () => {
  it("has unique folder names", () => {
    const names = TRIP_CENTROIDS.map((trip) => trip.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps every manual pin on the planet and gives every entry a rationale", () => {
    for (const trip of TRIP_CENTROIDS) {
      expect(Math.abs(trip.lat), trip.name).toBeLessThanOrEqual(90);
      expect(Math.abs(trip.lng), trip.name).toBeLessThanOrEqual(180);
      expect(trip.note.length, trip.name).toBeGreaterThan(40);
      expect(trip.label.trim(), trip.name).not.toBe("");
    }
  });

  it("marks exactly one collection and exactly one track", () => {
    expect(TRIP_CENTROIDS.filter((t) => t.kind === "collection").map((t) => t.name)).toEqual([
      "best-of",
    ]);
    expect(TRIP_CENTROIDS.filter((t) => t.track).map((t) => t.name)).toEqual(["transat"]);
  });
});
