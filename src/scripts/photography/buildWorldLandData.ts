/**
 * Build `src/content/world-land.json` — the coastline outlines the photo globe draws.
 *
 *   pnpm run buildWorldLandData
 *
 * SOURCE: Natural Earth, via the `world-atlas` npm package (`land-110m.json` and
 * `land-50m.json`, TopoJSON of the Natural Earth 1:110m and 1:50m land layers).
 * LICENCE: Natural Earth is in the public domain — no attribution required, none of the
 * data is restricted. See naturalearthdata.com/about/terms-of-use.
 *
 * SIMPLIFICATION: no geometric simplification is applied. The only reduction is
 * rounding every coordinate to 2 decimals (~1.1 km at the equator), then dropping the
 * consecutive duplicates that the rounding creates and any ring left with fewer than 4
 * points. Polygon/hole nesting is flattened away: the globe draws each ring as a closed
 * line loop, so an inland sea simply renders as one more outline, which is correct.
 *
 * WHY A HYBRID: the 110m layer has no small islands at all. Dominica, Guadeloupe,
 * Martinique, Tenerife, the Canaries and Cape Verde are absent from it, so nine trips
 * would pin over blank ocean. So the 110m land is the base, and the 50m rings whose
 * centre falls inside one of the visited windows below are appended. The 50m layer on
 * its own is 876 KB and cannot be filtered under budget without deleting the very
 * islands it is here to add.
 *
 * `world-atlas` and `topojson-client` are devDependencies used only by this script. The
 * runtime imports plain JSON and needs no mapping, topojson or d3 dependency.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { feature } from "topojson-client";
import type { LandRing, WorldLandData } from "../../lib/photoGeo";

const LAND_110M = resolve(cwd(), "node_modules/world-atlas/land-110m.json");
const LAND_50M = resolve(cwd(), "node_modules/world-atlas/land-50m.json");
const OUTPUT_PATH = resolve(cwd(), "src/content/world-land.json");

const DECIMALS = 2;
const MIN_RING_POINTS = 4;

/** `[minLon, minLat, maxLon, maxLat]` around the island groups Rico actually visited. */
const VISITED_WINDOWS: [number, number, number, number][] = [
  [-62.5, 13.5, -60.0, 17.0], // Lesser Antilles: Dominica, Guadeloupe, Martinique
  [-18.5, 27.0, -13.0, 29.5], // Canaries: Tenerife
  [23.0, 34.5, 26.5, 36.0], // Crete
  [79.0, 5.5, 82.5, 10.5], // Sri Lanka
  [114.0, -9.5, 116.5, -7.5], // Bali
  [-25.5, 14.5, -22.5, 17.5], // Cape Verde, a transat waypoint
];

function round(value: number): number {
  const factor = 10 ** DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

function simplifyRing(ring: number[][]): LandRing | null {
  const out: LandRing = [];
  for (const position of ring) {
    const point: [number, number] = [round(position[0]), round(position[1])];
    const previous = out[out.length - 1];
    if (previous && previous[0] === point[0] && previous[1] === point[1]) continue;
    out.push(point);
  }
  return out.length >= MIN_RING_POINTS ? out : null;
}

/** The slice of GeoJSON this script cares about — topojson-client's own types insist a
 * land layer is a single Feature, which it is not for `land-50m`. */
type LandGeometry = {
  type: string;
  coordinates?: number[][][] | number[][][][];
};
type LandFeature = { type: string; geometry?: LandGeometry | null; features?: LandFeature[] };

/** Flatten every Polygon/MultiPolygon in the land layer into a flat list of rings. */
async function ringsFrom(topoPath: string): Promise<LandRing[]> {
  // biome-ignore lint/suspicious/noExplicitAny: TopoJSON topologies are untyped JSON blobs.
  const topology = JSON.parse(await readFile(topoPath, "utf-8")) as any;
  const collection = feature(topology, topology.objects.land) as unknown as LandFeature;
  const geometries = (collection.features ?? [collection]).map((f) => f.geometry);

  const rings: LandRing[] = [];
  for (const geometry of geometries) {
    if (!geometry) continue;
    const polygons: number[][][][] =
      geometry.type === "MultiPolygon"
        ? (geometry.coordinates as number[][][][])
        : geometry.type === "Polygon"
          ? [geometry.coordinates as number[][][]]
          : [];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        const simplified = simplifyRing(ring);
        if (simplified) rings.push(simplified);
      }
    }
  }
  return rings;
}

function ringCentre(ring: LandRing): [number, number] {
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}

function insideVisitedWindow(ring: LandRing): boolean {
  const [lon, lat] = ringCentre(ring);
  return VISITED_WINDOWS.some(
    ([minLon, minLat, maxLon, maxLat]) =>
      lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat,
  );
}

async function main() {
  const base = await ringsFrom(LAND_110M);
  const islands = (await ringsFrom(LAND_50M)).filter(insideVisitedWindow);
  const rings = [...base, ...islands];

  const data: WorldLandData = { rings };
  // One ring per line: pretty-printing 5,600 coordinate pairs would be unreadable anyway.
  const json = `{\n  "rings": [\n${data.rings
    .map((ring) => `    ${JSON.stringify(ring)}`)
    .join(",\n")}\n  ]\n}\n`;
  await writeFile(OUTPUT_PATH, json, "utf-8");

  const points = rings.reduce((sum, ring) => sum + ring.length, 0);
  console.log(
    `world-land.json written: ${base.length} rings from land-110m + ${islands.length} island rings from land-50m ` +
      `= ${rings.length} rings, ${points} points, ${Buffer.byteLength(json)} bytes.`,
  );
  const missing = VISITED_WINDOWS.filter(
    (window) =>
      !rings.some((ring) => {
        const [lon, lat] = ringCentre(ring);
        return lon >= window[0] && lon <= window[2] && lat >= window[1] && lat <= window[3];
      }),
  );
  if (missing.length > 0) {
    console.warn(`WARNING: no land ring inside visited window(s): ${JSON.stringify(missing)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
