import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import {
  detailLevels,
  heightNoiseScale,
  moistureNoiseScale,
  persistence,
  temperatureNoiseScale,
} from "src/canvas/ChunkGenerationSystem/config";

import PoissonDiskSampling from "poisson-disk-sampling";
import { Vector3 } from "three";
// import { mkAlea } from "@spissvinkel/alea";
import { alea } from "seedrandom";

const SEED_VALUE = "1234567890";
// const { random } = mkAlea(SEED_VALUE);

// @ts-ignore-next-line
const random = new alea(SEED_VALUE);

const normalizeNoise = (func: NoiseFunction2D) => {
  return (x: number, y: number) => (func(x, y) + 1) / 2;
};

const scaleNoise = (func: NoiseFunction2D, scale: number) => {
  return (x: number, y: number) => func(x * scale, y * scale);
};

const heightNoise = createNoise2D(random);
export const temperatureNoise = scaleNoise(
  normalizeNoise(createNoise2D(random)),
  temperatureNoiseScale
);
export const moistureNoise = scaleNoise(
  normalizeNoise(createNoise2D(random)),
  moistureNoiseScale
);

export const sampleNoise = createNoise2D();

export function getFractalNoise(worldX: number, worldZ: number) {
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

export function poissonDiskSample(
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

  const noiseScale = 0.005;
  const threshold = -0.2;

  let points = p.fill().filter(([x, z]) => {
    const noiseValue = sampleNoise(
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
