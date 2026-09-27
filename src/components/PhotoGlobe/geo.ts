/**
 * Sphere math for the photo globe.
 *
 * This duplicates `latLngToVector3` from `src/lib/photoGeo.ts` on purpose: that module
 * reads the generated JSON with `node:fs` at build time, so importing it from a browser
 * component would drag `node:fs` into the client bundle. `landGeometry.test.ts` asserts the
 * two implementations stay identical — if you change one, change both.
 *
 * Convention: +Y is the north pole, lon 0 points at +X, lon 90E points at -Z.
 */

/** Radius of the opaque ocean sphere. Everything else is expressed relative to it. */
export const OCEAN_RADIUS = 1;
/**
 * Land sits just above the ocean. The gap has to beat the sagitta of a flat land
 * triangle (`1 - cos(MAX_EDGE_DEGREES / 2)` ≈ 0.00034 at 3°) so no triangle ever dips
 * below the ocean and z-fights with it.
 */
export const LAND_RADIUS = 1.0015;
export const COAST_RADIUS = 1.0022;
/** Under the land radius on purpose: the graticule shows over ocean and hides under land. */
export const GRATICULE_RADIUS = 1.0008;
export const POINT_RADIUS = 1.004;
export const TRACK_RADIUS = 1.006;
export const MARKER_RADIUS = 1.008;
export const ATMOSPHERE_RADIUS = 1.055;

export const MIN_CAMERA_DISTANCE = 1.45;
export const MAX_CAMERA_DISTANCE = 4.6;
export const DEFAULT_CAMERA_DISTANCE = 2.9;

const DEG_TO_RAD = Math.PI / 180;

/**
 * Latitude/longitude in degrees to a point on a sphere.
 *
 * The land mesh AND the markers must both go through this function. If they use even
 * slightly different axis conventions every pin drifts off its coastline, and the bug
 * reads as bad geodata rather than bad math.
 */
export function latLngToVector3(lat: number, lng: number, radius = 1): [number, number, number] {
  const phi = lat * DEG_TO_RAD;
  const lambda = lng * DEG_TO_RAD;
  const cosPhi = Math.cos(phi);
  return [
    radius * cosPhi * Math.cos(lambda),
    radius * Math.sin(phi),
    -radius * cosPhi * Math.sin(lambda),
  ];
}

/**
 * A flat position buffer that grows by doubling.
 *
 * The land mesh is ~220k floats. Collecting those in a plain `number[]` and copying it
 * into a `Float32Array` at the end costs several hundred milliseconds of boxing and
 * reallocation, which on a phone is a visible freeze the moment the globe's lazy chunk
 * lands. Writing straight into typed memory keeps the whole build under a frame budget.
 */
export class PositionSink {
  private data: Float32Array;
  private length = 0;

  constructor(initialFloats = 1024) {
    this.data = new Float32Array(initialFloats);
  }

  /** One vertex, already projected. */
  push3(x: number, y: number, z: number): void {
    if (this.length + 3 > this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    this.data[this.length++] = x;
    this.data[this.length++] = y;
    this.data[this.length++] = z;
  }

  /** One vertex given as lat/lng in degrees. */
  pushLatLng(lat: number, lng: number, radius: number): void {
    const phi = lat * DEG_TO_RAD;
    const lambda = lng * DEG_TO_RAD;
    const cosPhi = Math.cos(phi);
    this.push3(
      radius * cosPhi * Math.cos(lambda),
      radius * Math.sin(phi),
      -radius * cosPhi * Math.sin(lambda),
    );
  }

  get floatCount(): number {
    return this.length;
  }

  /** A view of exactly what was written. Copies once, at the end. */
  toFloat32Array(): Float32Array {
    return this.data.slice(0, this.length);
  }
}

/** Writes `latLngToVector3` straight into a flat position array — avoids a tuple per vertex. */
export function writeLatLng(target: number[], lat: number, lng: number, radius: number): void {
  const phi = lat * DEG_TO_RAD;
  const lambda = lng * DEG_TO_RAD;
  const cosPhi = Math.cos(phi);
  target.push(
    radius * cosPhi * Math.cos(lambda),
    radius * Math.sin(phi),
    -radius * cosPhi * Math.sin(lambda),
  );
}

/**
 * Angular distance between two lon/lat points, approximated in degrees.
 *
 * Plain euclidean distance in lon/lat space badly over-states the gap near the poles,
 * where a degree of longitude is a few kilometres. Scaling the longitude by the cosine of
 * the mean latitude keeps the subdivision budget where curvature actually is.
 */
export function angularDegrees(lonA: number, latA: number, lonB: number, latB: number): number {
  const dLat = latB - latA;
  const meanLat = (latA + latB) * 0.5;
  const dLon = (lonB - lonA) * Math.cos(meanLat * DEG_TO_RAD);
  return Math.hypot(dLat, dLon);
}

/**
 * Great-circle interpolation between two unit-sphere directions, in `maxStepDegrees`
 * steps. The transat track jumps tens of degrees between fixes; a straight chord between
 * those would sink through the globe and disappear behind it.
 */
export function greatCircleLatLngs(
  from: readonly [number, number],
  to: readonly [number, number],
  maxStepDegrees = 1.5,
): [number, number][] {
  const [latA, lngA] = from;
  const [latB, lngB] = to;
  const a = latLngToVector3(latA, lngA, 1);
  const b = latLngToVector3(latB, lngB, 1);
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const arcDegrees = (omega * 180) / Math.PI;
  const steps = Math.max(1, Math.ceil(arcDegrees / maxStepDegrees));
  const out: [number, number][] = [];
  if (omega < 1e-6)
    return [
      [latA, lngA],
      [latB, lngB],
    ];
  const sinOmega = Math.sin(omega);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wa = Math.sin((1 - t) * omega) / sinOmega;
    const wb = Math.sin(t * omega) / sinOmega;
    const x = a[0] * wa + b[0] * wb;
    const y = a[1] * wa + b[1] * wb;
    const z = a[2] * wa + b[2] * wb;
    const len = Math.hypot(x, y, z) || 1;
    const lat = (Math.asin(y / len) * 180) / Math.PI;
    const lng = (Math.atan2(-z / len, x / len) * 180) / Math.PI;
    out.push([lat, lng]);
  }
  return out;
}

/** Maps a value from `[inMin, inMax]` into `[0, 1]`, clamped. */
export function inverseLerpClamped(value: number, inMin: number, inMax: number): number {
  if (inMax === inMin) return 0;
  const t = (value - inMin) / (inMax - inMin);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
