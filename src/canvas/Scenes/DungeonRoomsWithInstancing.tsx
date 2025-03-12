import {
  Arch,
  Floor_Modular,
  Wall_Modular,
} from "@r3f/models/modular_dungeon_pack_1";
import { GroupProps } from "@react-three/fiber";
import {
  calculateDungeonLayout,
  convertLayoutToPositions,
  Position,
  Rotation,
} from "./DungeonRoomsLayoutCalculator";
import { useInstancedMesh2 } from "@r3f/InstancedMeshSystem/useInstancedMesh2";
import { useInstancedMeshMultiMaterial } from "@r3f/InstancedMeshSystem/useInstancedMesh2multiMaterial";
import { useEffect } from "react";
import { XYZ } from "@r3f/InstancedMeshSystem/ChunkPositionUpdater";

const Floors = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  // const { material, geometry} =
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Floor_Modular.glb",
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [positions, rotations]);

  return <InstancedMesh />;
};

const Walls = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Wall_Modular.glb",
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [positions, rotations]);

  return <InstancedMesh />;
};

const Arches = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Arch.glb",
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [positions, rotations]);

  return <InstancedMesh />;
};

export const DungeonFromLayout = (props: GroupProps) => {
  const components = calculateDungeonLayout();
  const { arches, walls, floors } = convertLayoutToPositions(components);

  return (
    <>
      <Floors positions={floors.positions} rotations={floors.rotations} />
      <Walls positions={walls.positions} rotations={walls.rotations} />
      <Arches positions={arches.positions} rotations={arches.rotations} />
    </>
  );
};
