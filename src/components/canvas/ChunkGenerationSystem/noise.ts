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

function getBiome(nTemp: number, nMoist: number, nHeight: number) {
  if (nHeight > 0.7) {
    return {
      color: new Color("#FFFFFF"),
      name: "Snow",
    };
  }

  if (nHeight > 0.6) {
    return {
      color: new Color("#A0A0A0"),
      name: "Mountain",
    };
  }

  if (nHeight < 0.3) {
    if (nMoist > 0.6) {
      return {
        color: new Color("#0077BE"),
        name: "Ocean",
      };
    }
    if (nMoist > 0.3) {
      return {
        color: new Color("#C2B280"),
        name: "Beach",
      };
    }
  }

  if (nTemp > 0.6) {
    if (nMoist < 0.3) {
      return {
        color: new Color("#EDC9AF"),
        name: "Desert",
      };
    }
    if (nMoist < 0.6) {
      return {
        color: new Color("#ADFF2F"),
        name: "Savanna",
      };
    }
    return {
      color: new Color("#228B22"),
      name: "Tropical Forest",
    };
  }

  if (nTemp > 0.3) {
    if (nMoist < 0.4) {
      return {
        color: new Color("#DAA520"),
        name: "Plains",
      };
    }
    if (nMoist < 0.7) {
      return {
        color: new Color("#228B22"),
        name: "Forest",
      };
    }
    return {
      color: new Color("#006400"),
      name: "Dense Forest",
    };
  }

  if (nMoist < 0.4) {
    return {
      color: new Color("#B5B5B5"),
      name: "Tundra",
    };
  }

  return {
    color: new Color("#006400"),
    name: "Taiga",
  };
}

export {
  heightNoise,
  temperatureNoise,
  moistureNoise,
  getBiome,
  getFractalNoise,
};
