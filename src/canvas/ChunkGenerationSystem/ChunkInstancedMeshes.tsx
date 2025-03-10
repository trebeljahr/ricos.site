import { memo } from "react";
import { MeshMaterialCombos } from "../InstancedMeshSystem/GenericInstancingSystem";
import { useMultiInstancedMesh2 } from "../InstancedMeshSystem/useMultiInstancedMesh2";
import { ChunkPositionUpdater } from "../InstancedMeshSystem/ChunkPositionUpdater";

const meshMaterialCombos: MeshMaterialCombos = [
  ["BirchTree_1_1", "White"],
  ["BirchTree_1_2", "Black"],
  ["BirchTree_1_3", "DarkGreen"],
  ["BirchTree_1_4", "Green"],
];

export const BirchTreesForChunks = memo(() => {
  const modelPath = "/3d-assets/glb/nature_pack/BirchTree_1.glb";
  const { InstancedMeshes, addPositions, removePositions } =
    useMultiInstancedMesh2({
      meshMaterialCombos,
      modelPath,
    });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      <InstancedMeshes />
    </>
  );
});

export const RocksForChunks = memo(() => {
  const modelPath = "/3d-assets/glb/nature_pack/Rock_1.glb";
  const rockMeshMaterialCombos: MeshMaterialCombos = [["Rock_1", "Rock"]];

  const { InstancedMeshes, addPositions, removePositions } =
    useMultiInstancedMesh2({
      meshMaterialCombos: rockMeshMaterialCombos,
      modelPath,
    });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      <InstancedMeshes />
    </>
  );
});

export const PineTreesForChunks = memo(() => {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["PineTree_1_1", "Wood"],
    ["PineTree_1_2", "Green"],
  ];
  const modelPath = "/3d-assets/glb/nature_pack/PineTree_1.glb";

  const { InstancedMeshes, addPositions, removePositions } =
    useMultiInstancedMesh2({
      meshMaterialCombos,
      modelPath,
    });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      <InstancedMeshes />
    </>
  );
});
