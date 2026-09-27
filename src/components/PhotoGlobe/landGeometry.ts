import { ShapeUtils, Vector2 } from "three";
import { angularDegrees, writeLatLng } from "./geo";

/** One closed coastline loop as `[lon, lat]` pairs — note the GeoJSON axis order. */
export type LandRing = [lon: number, lat: number][];

/** `{ x: longitude, y: latitude }`, the shape `ShapeUtils.triangulateShape` wants. */
type LonLat = { x: number; y: number };

/**
 * Longest edge a land triangle may keep before it is bisected. 3° of arc leaves a
 * sagitta of 0.00034 globe radii — a tenth of a pixel on a 600 px globe — so the flat
 * triangles read as a smooth sphere.
 */
export const MAX_EDGE_DEGREES = 3;
/** Step used to densify a coastline before it is drawn as line segments. */
export const COAST_STEP_DEGREES = 2;
/** 2^12 halvings turns even a pole-to-pole edge into a 0.04° sliver. */
const MAX_SPLIT_DEPTH = 12;
/** Longitude steps used to walk along a pole while closing a polar ring. */
const POLE_CLOSE_STEPS = 12;

export type LandGeometryData = {
  /**
   * Non-indexed triangle soup for the filled land mesh. No normals: the land material is
   * unlit, and on a sphere a normal is only the normalised position anyway.
   */
  fillPositions: Float32Array;
  /** Vertex pairs for a single `LineSegments` coastline. */
  coastPositions: Float32Array;
  triangleCount: number;
};

type UnwrappedRing = {
  path: LonLat[];
  /** `0` for an ordinary ring, `-1`/`1` when the ring wraps around the south/north pole. */
  polar: -1 | 0 | 1;
};

/**
 * Natural Earth stores Antarctica, Afro-Eurasia, Fiji and a Chukotka sliver with
 * longitudes that jump between -180 and +180 mid-ring. Triangulating that directly draws
 * a segment straight across the map and the fill collapses, so the ring is first
 * "unwrapped" into a continuous longitude range — Fiji becomes -180.6, Chukotka -181.3.
 * The sphere projection is periodic in longitude, so out-of-range values are harmless.
 */
export function unwrapRing(ring: LandRing): UnwrappedRing {
  const closed =
    ring.length > 2 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const source = closed ? ring.slice(0, -1) : ring;
  if (source.length === 0) return { path: [], polar: 0 };

  const path: LonLat[] = [{ x: source[0][0], y: source[0][1] }];
  for (let i = 1; i < source.length; i++) {
    let lon = source[i][0];
    const previous = path[i - 1].x;
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    path.push({ x: lon, y: source[i][1] });
  }

  // A ring that no longer closes after unwrapping has gone all the way round a pole.
  const closingGap = path[0].x - path[path.length - 1].x;
  if (Math.abs(closingGap) <= 180) return { path, polar: 0 };

  const meanLat = path.reduce((sum, point) => sum + point.y, 0) / path.length;
  const polar: -1 | 1 = meanLat < 0 ? -1 : 1;
  const poleLat = polar * 90;
  const startLon = path[path.length - 1].x;
  const endLon = path[0].x;
  for (let step = 0; step <= POLE_CLOSE_STEPS; step++) {
    const t = step / POLE_CLOSE_STEPS;
    path.push({ x: startLon + (endLon - startLon) * t, y: poleLat });
  }
  return { path, polar };
}

function pushProjectedTriangle(
  out: number[],
  a: LonLat,
  b: LonLat,
  c: LonLat,
  radius: number,
  depth: number,
): void {
  const ab = angularDegrees(a.x, a.y, b.x, b.y);
  const bc = angularDegrees(b.x, b.y, c.x, c.y);
  const ca = angularDegrees(c.x, c.y, a.x, a.y);
  const longest = Math.max(ab, bc, ca);

  if (longest > MAX_EDGE_DEGREES && depth < MAX_SPLIT_DEPTH) {
    // Bisect the longest edge. Splitting only the worst edge keeps the triangle budget
    // proportional to how much curvature the triangle actually spans, unlike a 1-to-4
    // split which quadruples even the sliver triangles earcut produces along a coast.
    if (longest === ab) {
      const m = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
      pushProjectedTriangle(out, a, m, c, radius, depth + 1);
      pushProjectedTriangle(out, m, b, c, radius, depth + 1);
    } else if (longest === bc) {
      const m = { x: (b.x + c.x) * 0.5, y: (b.y + c.y) * 0.5 };
      pushProjectedTriangle(out, a, b, m, radius, depth + 1);
      pushProjectedTriangle(out, a, m, c, radius, depth + 1);
    } else {
      const m = { x: (c.x + a.x) * 0.5, y: (c.y + a.y) * 0.5 };
      pushProjectedTriangle(out, a, b, m, radius, depth + 1);
      pushProjectedTriangle(out, m, b, c, radius, depth + 1);
    }
    return;
  }

  writeLatLng(out, a.y, a.x, radius);
  writeLatLng(out, b.y, b.x, radius);
  writeLatLng(out, c.y, c.x, radius);
}

function pushCoastline(out: number[], ring: UnwrappedRing, radius: number): void {
  const { path, polar } = ring;
  if (path.length < 2) return;
  // A polar ring was closed with a synthetic seam across the pole; drawing that seam
  // would put a hard line through Antarctica, so the coastline stays open there.
  const segments = polar === 0 ? path.length : path.length - POLE_CLOSE_STEPS - 2;

  for (let i = 0; i < segments; i++) {
    const from = path[i];
    const to = path[(i + 1) % path.length];
    const steps = Math.max(
      1,
      Math.ceil(angularDegrees(from.x, from.y, to.x, to.y) / COAST_STEP_DEGREES),
    );
    for (let step = 0; step < steps; step++) {
      const t0 = step / steps;
      const t1 = (step + 1) / steps;
      writeLatLng(out, from.y + (to.y - from.y) * t0, from.x + (to.x - from.x) * t0, radius);
      writeLatLng(out, from.y + (to.y - from.y) * t1, from.x + (to.x - from.x) * t1, radius);
    }
  }
}

/**
 * Turns the Natural Earth rings into one filled land mesh plus one coastline mesh.
 *
 * Both are built once and handed to a `BufferGeometry`; nothing here runs per frame.
 */
export function buildLandGeometry(
  rings: LandRing[],
  options: { fillRadius: number; coastRadius: number },
): LandGeometryData {
  const fill: number[] = [];
  const coast: number[] = [];

  for (const ring of rings) {
    const unwrapped = unwrapRing(ring);
    if (unwrapped.path.length < 3) continue;

    pushCoastline(coast, unwrapped, options.coastRadius);

    // triangulateShape needs real Vector2 instances (it calls `.equals`) and it mutates
    // the contour it is given, so it gets a copy — the coastline above came from the
    // untouched path.
    const contour = unwrapped.path.map((point) => new Vector2(point.x, point.y));
    let faces: number[][] = [];
    try {
      faces = ShapeUtils.triangulateShape(contour, []);
    } catch {
      // A ring earcut cannot handle is skipped rather than crashing the globe; the
      // coastline for it is already drawn, so the gap reads as an unfilled outline.
      continue;
    }

    for (const face of faces) {
      pushProjectedTriangle(
        fill,
        contour[face[0]],
        contour[face[1]],
        contour[face[2]],
        options.fillRadius,
        0,
      );
    }
  }

  return {
    fillPositions: new Float32Array(fill),
    coastPositions: new Float32Array(coast),
    triangleCount: fill.length / 9,
  };
}

/** Meridians and parallels every `stepDegrees`, as one `LineSegments` vertex buffer. */
export function buildGraticule(radius: number, stepDegrees = 30): Float32Array {
  const out: number[] = [];
  const segment = 3;

  for (let lon = -180; lon < 180; lon += stepDegrees) {
    for (let lat = -90; lat < 90; lat += segment) {
      writeLatLng(out, lat, lon, radius);
      writeLatLng(out, lat + segment, lon, radius);
    }
  }
  for (let lat = -60; lat <= 60; lat += stepDegrees) {
    for (let lon = -180; lon < 180; lon += segment) {
      writeLatLng(out, lat, lon, radius);
      writeLatLng(out, lat, lon + segment, radius);
    }
  }
  return new Float32Array(out);
}
