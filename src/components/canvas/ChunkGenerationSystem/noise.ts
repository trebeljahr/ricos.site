import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import {
  detailLevels,
  heightNoiseScale,
  moistureNoiseScale,
  persistence,
  temperatureNoiseScale,
} from "./config";

const normalizeNoise = (func: NoiseFunction2D) => {
  return (x: number, y: number) => (func(x, y) + 1) / 2;
};

const scaleNoise = (func: NoiseFunction2D, scale: number) => {
  return (x: number, y: number) => func(x * scale, y * scale);
};

const heightNoise = createNoise2D();
export const temperatureNoise = scaleNoise(
  normalizeNoise(createNoise2D()),
  temperatureNoiseScale
);
export const moistureNoise = scaleNoise(
  normalizeNoise(createNoise2D()),
  moistureNoiseScale
);

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
