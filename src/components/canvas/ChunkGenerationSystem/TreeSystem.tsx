// Tree type definitions and biome compatibility
import { Vector3 } from "three";
import { BiomeName, BiomeType } from "./noise";

// Define tree types
export enum TreeType {
  BIRCH = "BIRCH",
  OAK = "OAK",
  PINE = "PINE",
  SPRUCE = "SPRUCE",
  PALM = "PALM",
  ACACIA = "ACACIA",
  JUNGLE = "JUNGLE",
  DEAD = "DEAD",
}

// Define properties for each tree type
export interface TreeProperties {
  type: TreeType;
  scale: [number, number, number]; // Scale of the tree
  heightOffset: number; // Height offset from ground
  densityFactor: number; // Relative density of trees (0-1)
  biomes: BiomeName[]; // Compatible biomes
}

export const TREE_PROPERTIES: Record<TreeType, TreeProperties> = {
  [TreeType.BIRCH]: {
    type: TreeType.BIRCH,
    scale: [2, 2, 2],
    heightOffset: 0,
    densityFactor: 0.7,
    biomes: ["Forest", "Plains", "Taiga"],
  },
  [TreeType.OAK]: {
    type: TreeType.OAK,
    scale: [2.5, 2.2, 2.5],
    heightOffset: 0,
    densityFactor: 0.8,
    biomes: ["Forest", "Plains", "Dense Forest"],
  },
  [TreeType.PINE]: {
    type: TreeType.PINE,
    scale: [1.8, 3, 1.8],
    heightOffset: 0,
    densityFactor: 0.9,
    biomes: ["Taiga", "Snow", "Tundra", "Mountain", "Forest"],
  },

  [TreeType.SPRUCE]: {
    type: TreeType.SPRUCE,
    scale: [2, 3.5, 2],
    heightOffset: 0,
    densityFactor: 0.85,
    biomes: ["Taiga", "Mountain", "Tundra", "Forest"],
  },
  [TreeType.PALM]: {
    type: TreeType.PALM,
    scale: [2.2, 2.8, 2.2],
    heightOffset: 0,
    densityFactor: 0.5,
    biomes: ["Beach", "Desert", "Tropical Forest"],
  },
  [TreeType.ACACIA]: {
    type: TreeType.ACACIA,
    scale: [2.5, 2, 2.5],
    heightOffset: 0,
    densityFactor: 0.6,
    biomes: ["Savanna", "Plains"],
  },
  [TreeType.JUNGLE]: {
    type: TreeType.JUNGLE,
    scale: [2.2, 3.2, 2.2],
    heightOffset: 0,
    densityFactor: 1,
    biomes: ["Tropical Forest", "Dense Forest"],
  },
  [TreeType.DEAD]: {
    type: TreeType.DEAD,
    scale: [1.8, 1.5, 1.8],
    heightOffset: 0,
    densityFactor: 0.3,
    biomes: ["Desert"],
  },
};

interface TreePlacementInfo {
  type: TreeType;
  position: Vector3;
  scale: [number, number, number];
}

// Seeded random function to ensure consistent tree placement
export function seededRandom(seed: number): () => number {
  return function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

// Generate pseudo-random tree positions with Poisson-disc sampling
export function generateTreePositions(
  chunkPosition: Vector3,
  resolution: number,
  tileSize: number,
  biomeMap: BiomeType[][],
  heightMap: number[][],
  slopeMap: number[][]
): TreePlacementInfo[] {
  const trees: TreePlacementInfo[] = [];
  const seed = chunkPosition.x * 10000 + chunkPosition.z;
  const random = seededRandom(seed);

  const halfSize = tileSize / 2;
  const segmentSize = tileSize / (resolution - 1);

  const numSamplePoints = Math.floor(resolution * resolution * 0.1);
  for (let i = 0; i < numSamplePoints; i++) {
    const gridX = Math.floor(random() * (resolution - 2)) + 1;
    const gridZ = Math.floor(random() * (resolution - 2)) + 1;

    const biome = biomeMap[gridZ][gridX];
    const biomeDensity = biome.treeDensity || 0.3;
    if (random() > biomeDensity) {
      continue;
    }

    const slope = slopeMap[gridZ][gridX] || 0;
    if (slope > 0.7) {
      continue;
    }

    const localX =
      gridX * segmentSize - halfSize + (random() - 0.5) * segmentSize;
    const localZ =
      gridZ * segmentSize - halfSize + (random() - 0.5) * segmentSize;

    const height = heightMap[gridZ][gridX];

    const compatibleTrees = Object.values(TREE_PROPERTIES).filter((tree) =>
      tree.biomes.includes(biome.name)
    );

    if (compatibleTrees.length === 0) {
      continue; // No compatible trees for this biome
    }

    // Pick a random tree from compatible ones, weighted by their density factor
    const totalWeight = compatibleTrees.reduce(
      (sum, tree) => sum + tree.densityFactor,
      0
    );
    let randomWeight = random() * totalWeight;
    let selectedTree = compatibleTrees[0];

    for (const tree of compatibleTrees) {
      randomWeight -= tree.densityFactor;
      if (randomWeight <= 0) {
        selectedTree = tree;
        break;
      }
    }

    // Create tree placement
    trees.push({
      type: selectedTree.type,
      position: new Vector3(localX, height + selectedTree.heightOffset, localZ),
      scale: selectedTree.scale,
    });

    // Avoid placing trees too close to each other (simple approach)
    // In a real system, you would check for collisions with existing trees
  }

  return trees;
}

// Ensure trees don't overlap with each other
export function avoidTreeOverlap(
  trees: TreePlacementInfo[],
  minDistance: number = 5
): TreePlacementInfo[] {
  const result: TreePlacementInfo[] = [];

  for (const tree of trees) {
    let canPlace = true;

    for (const placedTree of result) {
      const dx = tree.position.x - placedTree.position.x;
      const dz = tree.position.z - placedTree.position.z;
      const distanceSquared = dx * dx + dz * dz;

      if (distanceSquared < minDistance * minDistance) {
        canPlace = false;
        break;
      }
    }

    if (canPlace) {
      result.push(tree);
    }
  }

  return result;
}

// Add variation to tree scales for more natural appearance
export function addTreeVariation(
  trees: TreePlacementInfo[]
): TreePlacementInfo[] {
  const random = seededRandom(12345);

  return trees.map((tree) => {
    // Add slight variation to scale (±15%)
    const variation = 0.85 + random() * 0.3;
    const newScale: [number, number, number] = [
      tree.scale[0] * variation,
      tree.scale[1] * (0.9 + random() * 0.2), // Different variation for height
      tree.scale[2] * variation,
    ];

    // Slight rotation by adjusting x,z position
    const angle = random() * Math.PI * 2;
    const radius = 0.5;
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;

    return {
      ...tree,
      position: new Vector3(
        tree.position.x + offsetX,
        tree.position.y,
        tree.position.z + offsetZ
      ),
      scale: newScale,
    };
  });
}
