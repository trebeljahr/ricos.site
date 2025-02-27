import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import {
  detailLevels,
  heightNoiseScale,
  moistureNoiseScale,
  persistence,
  temperatureNoiseScale,
} from "./config";
import { Color } from "three";

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

export type BiomeName =
  | "Snow"
  | "Mountain"
  | "Ocean"
  | "Beach"
  | "Desert"
  | "Savanna"
  | "Tropical Forest"
  | "Forest"
  | "Dense Forest"
  | "Plains"
  | "Tundra"
  | "Taiga";

export type BiomeType = {
  color: Color;
  name: BiomeName;
  treeDensity: number;
};

function getBiome(nTemp: number, nMoist: number, nHeight: number): BiomeType {
  if (nHeight > 0.7) {
    return {
      color: new Color("#FFFFFF"),
      name: "Snow",
      treeDensity: 0.1,
    };
  }

  if (nHeight > 0.6) {
    return {
      color: new Color("#A0A0A0"),
      name: "Mountain",
      treeDensity: 0.4,
    };
  }

  if (nHeight < 0.3) {
    if (nMoist > 0.6) {
      return {
        color: new Color("#0077BE"),
        name: "Ocean",
        treeDensity: 0,
      };
    }
    if (nMoist > 0.3) {
      return {
        color: new Color("#C2B280"),
        name: "Beach",
        treeDensity: 0.15,
      };
    }
  }

  if (nTemp > 0.6) {
    if (nMoist < 0.3) {
      return {
        color: new Color("#EDC9AF"),
        name: "Desert",
        treeDensity: 0.05,
      };
    }
    if (nMoist < 0.6) {
      return {
        color: new Color("#ADFF2F"),
        name: "Savanna",
        treeDensity: 0.3,
      };
    }
    return {
      color: new Color("#228B22"),
      name: "Tropical Forest",
      treeDensity: 0.8,
    };
  }

  if (nTemp > 0.3) {
    if (nMoist < 0.4) {
      return {
        color: new Color("#b2da20"),
        name: "Plains",
        treeDensity: 0.3,
      };
    }
    if (nMoist < 0.7) {
      return {
        color: new Color("#228B22"),
        name: "Forest",
        treeDensity: 0.7,
      };
    }
    return {
      color: new Color("#006400"),
      name: "Dense Forest",
      treeDensity: 0.7,
    };
  }

  if (nMoist < 0.4) {
    return {
      color: new Color("#B5B5B5"),
      name: "Tundra",
      treeDensity: 0.1,
    };
  }

  return {
    color: new Color("#9de19d"),
    name: "Taiga",
    treeDensity: 0.6,
  };
}

export {
  heightNoise,
  temperatureNoise,
  moistureNoise,
  getBiome,
  getFractalNoise,
};
