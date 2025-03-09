import { vec3 } from "gl-matrix";
import PoissonDiskSampling from "poisson-disk-sampling";
import { perlin2 } from "simplenoise";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import {
  detailLevels,
  heightNoiseScale,
  heightScale,
  moistureNoiseScale,
  persistence,
  temperatureNoiseScale,
  tileSize,
  treeMaxDistance,
  treeMinDistance,
} from "src/canvas/ChunkGenerationSystem/config";
import { expose } from "threads/worker";
import { Vector2, Vector3 } from "three";

const center = new Vector3(-tileSize / 2, 0, -tileSize / 2);

const normalizeNoise = (func: NoiseFunction2D) => {
  return (x: number, y: number) => (func(x, y) + 1) / 2;
};

const scaleNoise = (func: NoiseFunction2D, scale: number) => {
  return (x: number, y: number) => func(x * scale, y * scale);
};

const heightNoise = createNoise2D();

const temperatureNoise = scaleNoise(
  normalizeNoise(createNoise2D()),
  temperatureNoiseScale
);

const moistureNoise = scaleNoise(
  normalizeNoise(createNoise2D()),
  moistureNoiseScale
);

function getFractalNoise(worldX: number, worldZ: number) {
  let amplitude = 1;
  let frequency = 1;
  let noiseValue = 0;
  let totalAmplitude = 0;

  for (let i = 0; i < detailLevels; i++) {
    const noiseX = worldX * heightNoiseScale * frequency;
    const noiseZ = worldZ * heightNoiseScale * frequency;

    noiseValue += heightNoise(noiseX, noiseZ) * amplitude;

    totalAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return noiseValue / totalAmplitude;
}

function poissonDiskSample(
  width: number,
  min = 4,
  max = 5,
  {
    tries = 10,
    offset = { x: 0, y: 0 },
  }: { tries?: number; offset?: { x: number; y: number } } = {}
) {
  let p = new PoissonDiskSampling({
    shape: [width, width],
    minDistance: min,
    maxDistance: max,
    tries,
  });
  const noiseScale = 0.05;
  const threshold = -0.2;

  let points = p.fill().filter(([x, z]) => {
    const noiseValue = perlin2(
      (x + offset.x) * noiseScale,
      (z + offset.y) * noiseScale
    );

    if (noiseValue > threshold) {
      return true;
    }

    return false;
  });

  return points.map(([x, z]) => new Vector3(x, 0, z));
}

const getHeight = (x: number, z: number) => {
  const original = getFractalNoise(x, z);
  const remappedSample = (original + 1) / 2;
  const height = remappedSample * heightScale * 2 - heightScale / 2;
  return { height, remappedSample, original };
};

type XYZ = {
  x: number;
  y: number;
  z: number;
};

const generateInstanceData = (chunkOffset: XYZ) => {
  const { positions, scales, rotations } = poissonDiskSample(
    tileSize,
    treeMinDistance,
    treeMaxDistance,
    {
      offset: new Vector2(chunkOffset.x, chunkOffset.z),
    }
  ).reduce(
    (agg, pos) => {
      const worldPosition = pos
        .add(new Vector3(chunkOffset.x, chunkOffset.y, chunkOffset.z))
        .add(center);
      const { height } = getHeight(worldPosition.x, worldPosition.z);
      const position = worldPosition.setY(height);
      const scale = 1; // Math.random() + 1;
      const rotation = new Vector3(0, Math.random() * Math.PI * 2, 0);

      agg.positions.push(position);
      agg.scales.push(scale);
      agg.rotations.push(rotation);

      return agg;
    },
    {
      positions: [] as XYZ[],
      scales: [] as number[],
      rotations: [] as XYZ[],
    }
  );

  return { positions, scales, rotations };
};

const noiseWorker = {
  getFractalNoise,
  poissonDiskSample,
  temperatureNoise,
  moistureNoise,
  generateInstanceData,
  getHeight,
};

export type NoiseWorker = typeof noiseWorker;

expose(noiseWorker);
