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
import { generateCustomDungeon } from "./ProceduralDungeonGenerator";
import { XYZ } from "src/@types";

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
  }, [positions, rotations, addPositions]);

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
  }, [positions, rotations, addPositions]);

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
    defaultScale: 2,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [addPositions, positions, rotations]);

  return <InstancedMesh />;
};

export const DungeonFromLayout = () => {
  const components = generateCustomDungeon({
    minRooms: 10,
    maxRooms: 15,
    complexity: 70,
    sparseness: 40,
    roomDistribution: {
      small: 25,
      medium: 40,
      large: 25,
      hall: 10,
    },
    corridorWidthRange: [1, 2],
    corridorLengthRange: [2, 4],
  });
  const { arches, walls, floors } = convertLayoutToPositions(components);

  return (
    <>
      <Floors positions={floors.positions} rotations={floors.rotations} />
      <Walls positions={walls.positions} rotations={walls.rotations} />
      <Arches positions={arches.positions} rotations={arches.rotations} />
    </>
  );
};
