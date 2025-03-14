import { useInstancedMesh2 } from "@r3f/InstancedMeshSystem/useInstancedMesh2";
import { useInstancedMeshMultiMaterial } from "@r3f/InstancedMeshSystem/useInstancedMesh2multiMaterial";
import { Environment, PointMaterial, useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import { GLTFResult, XYZ } from "src/@types";
import { Color, DynamicDrawUsage } from "three";
import {
  Component,
  convertLayoutToPositions,
} from "./DungeonRoomsLayoutCalculator";

function Particles({
  positions,
  colors,
}: {
  positions: Float32Array;
  colors: Float32Array;
}) {
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          usage={DynamicDrawUsage}
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          usage={DynamicDrawUsage}
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <PointMaterial
        emissive={new Color(colors[0], colors[1], colors[2])}
        emissiveIntensity={1}
        transparent
        vertexColors
        size={2}
        sizeAttenuation={true}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

export const Railings = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Fence_Straight_Modular.glb",
    defaultScale: 0.5,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [addPositions, positions, rotations]);

  return <InstancedMesh />;
};

export const SideWallStairs = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Stairs_SideCover.glb",
    defaultScale: 0.5,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [addPositions, positions, rotations]);

  return <InstancedMesh />;
};

export const Torches = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/modular_dungeon_1/Torch.glb"
  ) as unknown as GLTFResult;

  const { InstancedMesh: Holders, addPositions: addHolders } =
    useInstancedMesh2({
      geometry: nodes.Torch_1.geometry,
      material: materials.DarkMetal,
      defaultScale: 0.25,
    });
  const color = "#00f7ff";

  const { InstancedMesh: Fires, addPositions: addFires } = useInstancedMesh2({
    geometry: nodes.Torch_2.geometry,
    material: materials.Fire,
    emissiveColor: color,
    emissiveIntensity: 5,
    defaultScale: 0.25,
  });

  // const {
  //   InstancedMesh,
  //   addPositions: addPositions2,
  //   ref,
  // } = useInstancedMesh2();

  useEffect(() => {
    addFires(positions, rotations);
    addHolders(positions, rotations);
  }, [addFires, addHolders, positions, rotations]);

  // const lights = positions.slice(0, 5);

  const pos = new Float32Array(
    positions.map(({ x, y, z }) => [x, y + 0.6, z]).flat()
  );

  const colorArray = Array.from({ length: positions.length }, () =>
    new Color(color).toArray()
  ).flat();
  const colors = new Float32Array(colorArray);

  return (
    <>
      {/* {lights.map((pos, index) => {
        const rot = rotations[index];

        return (
          <>
            <group key={index} rotation={[rot.x, rot.y, rot.z]}>
              <pointLight
                frustumCulled={true}
                distance={100}
                intensity={20}
                color={"#ff9500"}
                position={[pos.x, pos.y + 0.5, pos.z + 0.5]}
                castShadow={false}
              />
            </group>
          </>
        );
      })} */}
      {/* <Particles positions={pos} colors={colors} /> */}

      <Environment resolution={256} frames={Infinity}>
        <Particles positions={pos} colors={colors} />
      </Environment>

      <Fires />
      <Holders />
      {/* <InstancedMesh /> */}
    </>
  );
};

export const Stairs = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Stairs_Modular.glb",
    defaultScale: 0.5,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [addPositions, positions, rotations]);

  return <InstancedMesh />;
};

export const Coins = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Coin_Pile.glb",
    defaultScale: 5,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [addPositions, positions, rotations]);

  return <InstancedMesh />;
};

export const Floors = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/modular_dungeon_1/Floor_Modular.glb"
  ) as unknown as GLTFResult;

  const { InstancedMesh, addPositions } = useInstancedMesh2({
    geometry: nodes.Floor_Modular.geometry,
    material: materials.Grey_Floor,
    defaultScale: 0.5,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [positions, rotations, addPositions]);

  return <InstancedMesh />;
};

export const Walls = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Wall_Modular.glb",
    defaultScale: 0.5,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [positions, rotations, addPositions]);

  return <InstancedMesh />;
};

export const Arches = ({
  positions,
  rotations,
}: {
  positions: XYZ[];
  rotations: XYZ[];
}) => {
  const { InstancedMesh, addPositions } = useInstancedMeshMultiMaterial({
    modelPath: "/3d-assets/glb/modular_dungeon_1/Arch.glb",
    defaultScale: 0.25,
  });

  useEffect(() => {
    addPositions(positions, rotations);
  }, [addPositions, positions, rotations]);

  return <InstancedMesh />;
};

export const DungeonFromLayout = ({
  components,
}: {
  components: Component[];
}) => {
  const { arches, walls, floors, torches } =
    convertLayoutToPositions(components);

  return (
    <>
      <Floors positions={floors.positions} rotations={floors.rotations} />
      <Walls positions={walls.positions} rotations={walls.rotations} />
      <Arches positions={arches.positions} rotations={arches.rotations} />
      <Torches positions={torches.positions} rotations={torches.rotations} />
    </>
  );
};
