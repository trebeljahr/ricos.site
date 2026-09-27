import { describe, expect, it } from "vitest";
import land from "../../content/world-land.json";
import { latLngToVector3 as loaderLatLngToVector3 } from "../../lib/photoGeo";
import { latLngToVector3 } from "./geo";
import {
  buildGraticule,
  buildLandGeometry,
  type LandRing,
  MAX_EDGE_DEGREES,
  unwrapRing,
} from "./landGeometry";

const rings = land.rings as LandRing[];

describe("latLngToVector3", () => {
  it("matches the build-time implementation in src/lib/photoGeo", () => {
    for (const [lat, lng] of [
      [0, 0],
      [90, 0],
      [-90, 137],
      [15.37, -61.34],
      [52.52, 13.4],
      [-33.9, 151.2],
    ]) {
      expect(latLngToVector3(lat, lng, 1.0015)).toEqual(loaderLatLngToVector3(lat, lng, 1.0015));
    }
  });

  it("puts lon 0 on +X, lon 90E on -Z and the north pole on +Y", () => {
    const [x, y, z] = latLngToVector3(0, 0);
    expect([x, y, z].map((v) => Math.round(v) + 0)).toEqual([1, 0, 0]);
    const east = latLngToVector3(0, 90);
    expect(Math.round(east[2])).toBe(-1);
    expect(Math.round(latLngToVector3(90, 0)[1])).toBe(1);
  });
});

describe("unwrapRing", () => {
  it("keeps an ordinary ring untouched apart from the duplicated end point", () => {
    const ring: LandRing = [
      [10, 0],
      [12, 0],
      [12, 2],
      [10, 0],
    ];
    const { path, polar } = unwrapRing(ring);
    expect(polar).toBe(0);
    expect(path).toEqual([
      { x: 10, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 2 },
    ]);
  });

  it("unwraps a ring that straddles the antimeridian into continuous longitudes", () => {
    // The real Chukotka sliver from world-land.json: -180 and +180 in the same ring.
    const ring: LandRing = [
      [-180, 71.52],
      [180, 70.83],
      [178.9, 70.78],
      [178.73, 71.1],
      [-180, 71.52],
    ];
    const { path, polar } = unwrapRing(ring);
    expect(polar).toBe(0);
    expect(path.map((p) => p.x)).toEqual([-180, -180, -181.1, -181.27]);
  });

  it("closes Antarctica over the south pole instead of leaving it open", () => {
    const antarctica = rings.find((ring) => ring.some(([, lat]) => lat < -84));
    expect(antarctica).toBeDefined();
    const { path, polar } = unwrapRing(antarctica as LandRing);
    expect(polar).toBe(-1);
    expect(path.filter((p) => p.y === -90).length).toBeGreaterThan(2);
  });
});

describe("buildLandGeometry", () => {
  const geometry = buildLandGeometry(rings, { fillRadius: 1.0015, coastRadius: 1.0022 });

  it("produces a finite, spherical fill", () => {
    expect(geometry.triangleCount).toBeGreaterThan(1000);
    expect(geometry.fillPositions.length % 9).toBe(0);

    // One assertion, not one per vertex: the shipped outline has ~21k triangles, and
    // 63k expect() calls take longer than the whole test suite is allowed.
    let worstDeviation = 0;
    for (let i = 0; i < geometry.fillPositions.length; i += 3) {
      const radius = Math.hypot(
        geometry.fillPositions[i],
        geometry.fillPositions[i + 1],
        geometry.fillPositions[i + 2],
      );
      worstDeviation = Math.max(worstDeviation, Math.abs(radius - 1.0015));
    }
    expect(worstDeviation).toBeLessThan(1e-6);
  });

  it("subdivides every triangle below the curvature budget", () => {
    // A chord this short sags 0.00034 radii below the sphere, well inside the 0.0015
    // gap to the ocean, so no land triangle can ever poke through it.
    const maxChord = 2 * 1.0015 * Math.sin((MAX_EDGE_DEGREES * Math.PI) / 360) + 1e-6;
    let longest = 0;
    for (let i = 0; i < geometry.fillPositions.length; i += 9) {
      for (const [a, b] of [
        [0, 3],
        [3, 6],
        [6, 0],
      ]) {
        longest = Math.max(
          longest,
          Math.hypot(
            geometry.fillPositions[i + a] - geometry.fillPositions[i + b],
            geometry.fillPositions[i + a + 1] - geometry.fillPositions[i + b + 1],
            geometry.fillPositions[i + a + 2] - geometry.fillPositions[i + b + 2],
          ),
        );
      }
    }
    expect(longest).toBeLessThanOrEqual(maxChord);
  });

  it("covers roughly the real land fraction of the planet", () => {
    let area = 0;
    const p = geometry.fillPositions;
    for (let i = 0; i < p.length; i += 9) {
      const ux = p[i + 3] - p[i];
      const uy = p[i + 4] - p[i + 1];
      const uz = p[i + 5] - p[i + 2];
      const vx = p[i + 6] - p[i];
      const vy = p[i + 7] - p[i + 1];
      const vz = p[i + 8] - p[i + 2];
      area += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    }
    const fraction = area / (4 * Math.PI * 1.0015 ** 2);
    // Land plus ice shelves is a touch under 30% of the surface.
    expect(fraction).toBeGreaterThan(0.24);
    expect(fraction).toBeLessThan(0.34);
  });

  it("emits coastline vertices in pairs", () => {
    expect(geometry.coastPositions.length % 6).toBe(0);
    expect(geometry.coastPositions.length).toBeGreaterThan(0);
  });
});

describe("buildGraticule", () => {
  it("emits line-segment pairs on the sphere", () => {
    const graticule = buildGraticule(1.0008);
    expect(graticule.length % 6).toBe(0);
    for (let i = 0; i < graticule.length; i += 3) {
      expect(Math.hypot(graticule[i], graticule[i + 1], graticule[i + 2])).toBeCloseTo(1.0008, 6);
    }
  });
});
