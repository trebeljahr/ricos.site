import { Vector3 } from "three";
import { BiomeType } from "../ChunkGenerationSystem/Biomes";
import { baseResolution } from "../ChunkGenerationSystem/config";

export enum TreeType {
  BIRCH = "BIRCH",
  OAK = "OAK",
  PINE = "PINE",
  PALM = "PALM",
  ACACIA = "ACACIA",
  JUNGLE = "JUNGLE",
  DEAD = "DEAD",
}

export interface TreeProperties {
  type: TreeType;
  scale: [number, number, number];
  heightOffset: number;
  densityFactor: number;
}

export const TREE_PROPERTIES: Record<TreeType, TreeProperties> = {
  [TreeType.BIRCH]: {
    type: TreeType.BIRCH,
    scale: [2, 2, 2],
    heightOffset: 0,
    densityFactor: 0.7,
  },
  [TreeType.OAK]: {
    type: TreeType.OAK,
    scale: [2.5, 2.2, 2.5],
    heightOffset: 0,
    densityFactor: 0.8,
  },
  [TreeType.PINE]: {
    type: TreeType.PINE,
    scale: [1.8, 3, 1.8],
    heightOffset: 0,
    densityFactor: 0.9,
  },
  [TreeType.PALM]: {
    type: TreeType.PALM,
    scale: [2.2, 2.8, 2.2],
    heightOffset: 0,
    densityFactor: 0.5,
  },
  [TreeType.ACACIA]: {
    type: TreeType.ACACIA,
    scale: [2.5, 2, 2.5],
    heightOffset: 0,
    densityFactor: 0.6,
  },
  [TreeType.JUNGLE]: {
    type: TreeType.JUNGLE,
    scale: [2.2, 3.2, 2.2],
    heightOffset: 0,
    densityFactor: 1,
  },
  [TreeType.DEAD]: {
    type: TreeType.DEAD,
    scale: [1.8, 1.5, 1.8],
    heightOffset: 0,
    densityFactor: 0.3,
  },
};

interface TreePlacementInfo {
  type: TreeType;
  position: Vector3;
  scale: [number, number, number];
  rotation: [number, number, number];
}

export function seededRandom(seed: number): () => number {
  return function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

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

  const numSamplePoints = Math.floor(baseResolution * baseResolution * 0.1);
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

    const compatibleTrees = biome.treeTypes.map(
      (tree) => TREE_PROPERTIES[tree]
    );

    if (compatibleTrees.length === 0) {
      continue;
    }

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

    trees.push({
      type: selectedTree.type,
      position: new Vector3(
        localX,
        height + selectedTree.heightOffset - 1,
        localZ
      ),
      scale: selectedTree.scale,
      rotation: [0, random() * Math.PI * 2, 0],
    });
  }

  return trees;
}

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

export function addTreeVariation(
  trees: TreePlacementInfo[]
): TreePlacementInfo[] {
  const random = seededRandom(12345);

  return trees.map((tree) => {
    const variation = 0.85 + random() * 0.3;
    const newScale: [number, number, number] = [
      tree.scale[0] * variation,
      tree.scale[1] * (0.9 + random() * 0.2),
      tree.scale[2] * variation,
    ];

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
