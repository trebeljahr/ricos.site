import { BiomeType, getBiome } from "@r3f/ChunkGenerationSystem/Biomes";
import { mode, tileSize } from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { moistureNoise, temperatureNoise } from "src/lib/utils/noise";
import { Color, Vector3 } from "three";

export type TerrainData = ReturnType<typeof generateTerrainData>;

function generateTerrainData(
  worldOffset: { x: number; z: number },
  chunkId: string,
  resolution: number
) {
  const size = tileSize;
  const halfSize = size / 2;
  const segmentSize = size / (resolution - 1);
  const _color = new Color();

  const vertices = [];
  const colors = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // have 2 extra rows and columns to calculate normals with offsets
  const n = resolution + 2;
  const heightMap: number[][] = Array.from(Array(n), () => new Array(n));

  const heightNoiseMap = new Array(resolution + 2)
    .fill(0)
    .map(() => new Array(resolution + 2).fill(0));

  const moistureMap: number[][] = new Array(resolution + 2)
    .fill(0)
    .map(() => new Array(resolution + 2).fill(0));

  const temperatureMap: number[][] = new Array(resolution + 2)
    .fill(0)
    .map(() => new Array(resolution + 2).fill(0));

  const biomeMap: BiomeType[][] = new Array(resolution + 2)
    .fill(0)
    .map(() => new Array(resolution + 2).fill("plains"));

  for (let z = -1; z <= resolution; z++) {
    const localZ = z * segmentSize - halfSize;
    const worldZ = worldOffset.z + localZ;

    for (let x = -1; x <= resolution; x++) {
      const localX = x * segmentSize - halfSize;
      const worldX = worldOffset.x + localX;

      const { height, remappedSample } = getHeight(worldX, worldZ);
      const moisture = moistureNoise(worldX, worldZ);
      const temperature = temperatureNoise(worldX, worldZ);

      heightMap[z + 1][x + 1] = height;
      heightNoiseMap[z + 1][x + 1] = remappedSample;
      moistureMap[z + 1][x + 1] = moisture;
      temperatureMap[z + 1][x + 1] = temperature;
    }
  }

  const heightfield = [];

  for (let z = 0; z < resolution; z++) {
    const localZ = z * segmentSize;

    for (let x = 0; x < resolution; x++) {
      const localX = x * segmentSize;

      const hx = x + 1; // offset by 1 to account for extra row and column
      const hz = z + 1; // offset by 1 to account for extra row and column

      const height = heightMap[hz][hx];

      // get heights of surrounding vertices
      const heightLeft = heightMap[hz][hx - 1];
      const heightRight = heightMap[hz][hx + 1];
      const heightDown = heightMap[hz - 1][hx];
      const heightUp = heightMap[hz + 1][hx];

      const posDown = new Vector3(0, heightDown, -segmentSize);
      const posTop = new Vector3(0, heightUp, +segmentSize);
      const posLeft = new Vector3(-segmentSize, heightLeft, 0);
      const posRight = new Vector3(+segmentSize, heightRight, 0);

      const deltaZ = posTop.sub(posDown);
      const deltaX = posLeft.sub(posRight);
      const normal = deltaZ.cross(deltaX).negate().normalize();

      // store height for heightfield collider => traverse heights in x direction in reverse order because that's how the heightfield collider expects it
      const heightForHeightfield = heightMap[hz][resolution + 1 - hx];
      heightfield.push(heightForHeightfield);

      vertices.push(localX - halfSize, height, localZ - halfSize);
      uvs.push((localX / resolution) * 5, (localZ / resolution) * 5);
      normals.push(normal.x, normal.y, normal.z);

      const biome = getBiome(
        temperatureMap[hz][hx],
        moistureMap[hz][hx],
        heightNoiseMap[hz][hx]
      );

      const moisture = moistureMap[hz][hx];
      const temperature = temperatureMap[hz][hx];
      const h = heightNoiseMap[hz][hx];

      biomeMap[hz][hx] = biome;

      const r = localX / size + 0.5;
      const g = localZ / size + 0.5;
      _color.setRGB(r, g, 1);

      if (mode === "height") {
        colors.push(h, h, h);
      } else if (mode === "biome" || mode === "landscape") {
        colors.push(biome.color.r, biome.color.g, biome.color.b);
      } else if (mode === "moisture") {
        colors.push(0, moisture, moisture);
      } else if (mode === "temperature") {
        colors.push(temperature, temperature, temperature);
      } else if (mode === "flat") {
        colors.push(1, 1, 1);
      } else if (mode === "normals") {
        colors.push(normal.x, normal.y, normal.z);
      } else if (mode === "colors") {
        colors.push(_color.r, _color.g, _color.b);
      } else {
        colors.push(0.5, 0.5, 0.5);
      }

      if (x < resolution - 1 && z < resolution - 1) {
        const vertexIndex = x + z * resolution;

        indices.push(vertexIndex, vertexIndex + 1, vertexIndex + resolution);

        indices.push(
          vertexIndex + 1,
          vertexIndex + resolution + 1,
          vertexIndex + resolution
        );
      }
    }
  }

  // the .reverse() is necessary to correct the winding order in the mesh!
  // if not reversing the "back" of the plane will be facing Y up which
  // is incorrect and will mess with normal calculation
  indices.reverse();

  return {
    vertices,
    colors,
    normals,
    uvs,
    indices,
    heightfield,
    biomeMap,
    temperatureMap,
    moistureMap,
    heightMap,
    heightNoiseMap,
    chunkId,
  };
}

addEventListener(
  "message",
  async (
    event: MessageEvent<{
      worldOffset: { x: number; z: number };
      divisions: number;
      chunkId: string;
    }>
  ) => {
    const data = generateTerrainData(
      event.data.worldOffset,
      event.data.chunkId,
      event.data.divisions
    );

    postMessage(data);
  }
);
