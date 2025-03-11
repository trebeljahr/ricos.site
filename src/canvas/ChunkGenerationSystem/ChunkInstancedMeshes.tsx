import { useInstancedMeshMultiMaterial } from "@r3f/InstancedMeshSystem/useInstancedMesh2multiMaterial";
import { ChunkPositionUpdater } from "../InstancedMeshSystem/ChunkPositionUpdater";

const InstancedMeshForChunks = ({ modelPath }: { modelPath: string }) => {
  const { InstancedMesh, addPositions, removePositions } =
    useInstancedMeshMultiMaterial({
      modelPath,
    });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      <InstancedMesh />
    </>
  );
};

const rocks = "/3d-assets/glb/simple_nature_pack/Rock3.glb";
const pineTree = "/3d-assets/glb/nature_pack/PineTree_1.glb";
const birchTree = "/3d-assets/glb/nature_pack/BirchTree_1.glb";

export const RocksForChunks = () => {
  return <InstancedMeshForChunks modelPath={rocks} />;
};

export const PineTreesForChunks = () => {
  return <InstancedMeshForChunks modelPath={pineTree} />;
};

export const BirchTreesForChunks = () => {
  return <InstancedMeshForChunks modelPath={birchTree} />;
};
