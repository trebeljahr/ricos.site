import { Color } from "three";
import { TreeType } from "./TreeSystem";

export type BiomeName =
  | "Snow"
  | "Mountain"
  | "Ocean"
  | "Beach"
  | "Desert"
  | "Savanna"
  | "Jungle"
  | "Forest"
  | "DenseForest"
  | "Plains"
  | "Tundra"
  | "Taiga";

export type BiomeType = {
  color: Color;
  name: BiomeName;
  treeDensity: number;
  treeTypes: TreeType[];
};

const Biomes: Record<BiomeName, BiomeType> = {
  Snow: {
    name: "Snow",
    color: new Color("#FFFFFF"),
    treeDensity: 0.1,
    treeTypes: [TreeType.PINE],
  },
  Mountain: {
    name: "Mountain",
    color: new Color("#A0A0A0"),
    treeDensity: 0.4,
    treeTypes: [TreeType.PINE],
  },
  Ocean: {
    name: "Ocean",
    color: new Color("#0077BE"),
    treeDensity: 0,
    treeTypes: [],
  },

  Beach: {
    name: "Beach",
    color: new Color("#C2B280"),
    treeDensity: 0.15,
    treeTypes: [TreeType.PALM],
  },

  Desert: {
    name: "Desert",
    color: new Color("#EDC9AF"),
    treeDensity: 0.05,
    treeTypes: [TreeType.ACACIA],
  },

  Savanna: {
    name: "Savanna",
    color: new Color("#ADFF2F"),
    treeDensity: 0.3,
    treeTypes: [TreeType.ACACIA],
  },

  Jungle: {
    name: "Jungle",
    color: new Color("#228B22"),
    treeDensity: 0.8,
    treeTypes: [TreeType.PALM, TreeType.JUNGLE],
  },

  Forest: {
    name: "Forest",
    color: new Color("#228B22"),
    treeDensity: 0.7,
    treeTypes: [TreeType.OAK, TreeType.PINE],
  },

  DenseForest: {
    name: "DenseForest",
    color: new Color("#006400"),
    treeDensity: 0.7,
    treeTypes: [TreeType.OAK, TreeType.PINE, TreeType.JUNGLE],
  },

  Plains: {
    name: "Plains",
    color: new Color("#b2da20"),
    treeDensity: 0.3,
    treeTypes: [TreeType.OAK, TreeType.ACACIA],
  },

  Tundra: {
    name: "Tundra",
    color: new Color("#B5B5B5"),
    treeDensity: 0.1,
    treeTypes: [TreeType.PINE],
  },

  Taiga: {
    name: "Taiga",
    color: new Color("#b7f5e9"),
    treeDensity: 0.6,
    treeTypes: [TreeType.PINE],
  },
};

export function getBiome(
  nTemp: number,
  nMoist: number,
  nHeight: number
): BiomeType {
  if (nHeight > 0.7) {
    return Biomes.Snow;
  }

  if (nHeight > 0.6) {
    return Biomes.Mountain;
  }

  if (nHeight < 0.3) {
    if (nMoist > 0.6) {
      return Biomes.Ocean;
    }
    if (nMoist > 0.3) {
      return Biomes.Beach;
    }
  }

  if (nTemp > 0.6) {
    if (nMoist < 0.3) {
      return Biomes.Desert;
    }
    if (nMoist < 0.6) {
      return Biomes.Savanna;
    }
    return Biomes.Jungle;
  }

  if (nTemp > 0.3) {
    if (nMoist < 0.4) {
      return Biomes.Plains;
    }
    if (nMoist < 0.7) {
      return Biomes.Forest;
    }
    return Biomes.DenseForest;
  }

  if (nMoist < 0.4) {
    return Biomes.Tundra;
  }

  return Biomes.Taiga;
}
