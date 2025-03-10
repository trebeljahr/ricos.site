import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { XYZ } from "@r3f/InstancedMeshSystem/ChunkPositionUpdater";
import {
  tileSize,
  treeMaxDistance,
  treeMinDistance,
} from "src/canvas/ChunkGenerationSystem/config";
import { poissonDiskSample } from "src/lib/utils/noise";
import { Vector2, Vector3 } from "three";

const center = new Vector3(-tileSize / 2, 0, -tileSize / 2);

export const generateInstanceData = (chunkOffset: XYZ) => {
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
      const scale = (Math.random() + 1) * 2;
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
