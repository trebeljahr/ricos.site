import {
  ChunkPositionUpdater,
  PositionsUpdateHookProps,
} from "@r3f/InstancedMeshSystem/ChunkPositionUpdater";
import { useInstancedMeshMultiMaterial } from "@r3f/InstancedMeshSystem/useInstancedMesh2multiMaterial";
import { memo } from "react";
import { Vector3 } from "three";
import { tileSize } from "./config";

const center = new Vector3(-tileSize / 2, 0, -tileSize / 2);

const InstancedMeshForChunks = memo(({ modelPath }: { modelPath: string }) => {
  const { addPositions, removePositions } = useInstancedMeshMultiMaterial({
    modelPath,
  });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      {/* <InstancedMesh /> */}
    </>
  );
});

const ChunkUpdater = ({
  addPositions,
  removePositions,
}: PositionsUpdateHookProps) => {
  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
    </>
  );
};

const rocks = "/3d-assets/glb/simple_nature_pack/Rock3.glb";
const pineTree = "/3d-assets/glb/nature_pack/PineTree_1.glb";
const birchTree = "/3d-assets/glb/nature_pack/BirchTree_1.glb";
const snowyPineTree = "/3d-assets/glb/nature_pack/PineTree_Snow_1.glb";

export const RocksForChunks = () => {
  return <InstancedMeshForChunks modelPath={rocks} />;
};

export const PineTreesForChunks = () => {
  return <InstancedMeshForChunks modelPath={pineTree} />;
};

export const BirchTreesForChunks = () => {
  return <InstancedMeshForChunks modelPath={birchTree} />;
};

export const SnowyPineTreesForChunks = () => {
  return <InstancedMeshForChunks modelPath={snowyPineTree} />;
};
