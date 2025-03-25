import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import {
  Arches,
  Coins,
  Floors,
  SideWallStairs,
  Stairs,
  Torches,
  Walls,
} from "@r3f/Dungeon/DungeonRoomsWithInstancing";
import {
  DungeonMeshGenerator,
  MeshType,
} from "@r3f/Dungeon/Generator3D/ConvertToMesh";
import { DungeonGenerator3D } from "@r3f/Dungeon/Generator3D/Generator";
import {
  CellType3D,
  Vector3,
  Vector3Int,
} from "@r3f/Dungeon/Generator3D/Types";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { Perf } from "r3f-perf";
import { useEffect, useMemo, useRef } from "react";
import { InstancedMesh, Matrix4, Vector3 as Vector3FromThreeJS } from "three";

const RenderDungeon = ({ seed }: { seed?: number }) => {
  const { grid3D, renderPass } = useMemo(() => {
    const generator3D = new DungeonGenerator3D(
      new Vector3Int(50, 5, 50),
      30,
      new Vector3Int(6, 1, 6),
      new Vector3Int(3, 1, 3),
      seed?.toString() || (Math.random() * 1000).toString()
    );

    const grid3D = generator3D.generate();

    const counts = grid3D.data.reduce(
      (acc, cellType) => {
        if (cellType === CellType3D.None) return acc;

        switch (cellType) {
          case CellType3D.Room:
            acc.rooms++;
            break;
          case CellType3D.Hallway:
            acc.hallways++;
            break;
          case CellType3D.Stairs:
            acc.stairs++;
            break;
          case CellType3D.RoomCenterAxis:
            acc.doors++;
            break;
        }

        return acc;
      },
      { rooms: 0, hallways: 0, stairs: 0, doors: 0 }
    );

    const meshGenerator = new DungeonMeshGenerator(grid3D, seed?.toString());
    const meshes = meshGenerator.generateMeshes();

    const initEmpty = () =>
      ({ positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      });

    const renderPass = meshes.reduce(
      (acc, mesh) => {
        return {
          ...acc,
          [mesh.meshType]: {
            ...acc[mesh.meshType],
            positions: [...acc[mesh.meshType].positions, mesh.position],
            rotations: [...acc[mesh.meshType].rotations, mesh.rotation],
          },
        };
      },
      {
        [MeshType.Floor]: initEmpty(),
        [MeshType.Ceiling]: initEmpty(),
        [MeshType.Debug]: initEmpty(),
        [MeshType.Wall]: initEmpty(),
        [MeshType.Door]: initEmpty(),
        [MeshType.DoorFrame]: initEmpty(),
        [MeshType.Stairs]: initEmpty(),
        [MeshType.StairsRailing]: initEmpty(),
        [MeshType.StairWall]: initEmpty(),
        [MeshType.Torch]: initEmpty(),
      }
    );

    return { generator3D, grid3D, renderPass, counts };
  }, [seed]);

  return (
    <group position={[grid3D.size.x / 2, -0.1, grid3D.size.z / 2]} scale={4}>
      <group position={[-grid3D.size.x / 2, 1, -grid3D.size.z / 2]}>
        <Arches {...renderPass[MeshType.DoorFrame]} />
        <Walls {...renderPass[MeshType.Wall]} />
        <Coins {...renderPass[MeshType.Debug]} />
        <Torches {...renderPass[MeshType.Torch]} />
        <SideWallStairs {...renderPass[MeshType.StairWall]} />
        <Floors
          {...{
            rotations: [
              ...renderPass[MeshType.Floor].rotations,
              ...renderPass[MeshType.Ceiling].rotations,
            ],
            positions: [
              ...renderPass[MeshType.Floor].positions,
              ...renderPass[MeshType.Ceiling].positions,
            ],
          }}
        />
        <Stairs {...renderPass[MeshType.Stairs]} />

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
      </group>
    </group>
  );
};

const seoInfo = {
  title: "Procedurally Generated 3D Dungeon",
  description:
    "A 3D dungeon room generated in the browser, powered by R3F, Typescript, and a port of vazgriz's dungeon generator visualized with free 3D models from Quaternius",
  url: "/r3f/dungeon/dungeon-algo-3d",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/r3f/dungeon-3d.png",
  imageAlt: "a 3D dungeon room generated in the browser",
};

export default function Page() {
  const backgroundColor = "#191616";
  const viewDistance = 30;

  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput
        camera={{ far: viewDistance, position: [25, 10, 25] }}
      >
        <fog attach="fog" args={[backgroundColor, 5, viewDistance]} />
        <color attach="background" args={[backgroundColor]} />

        <ambientLight args={["#404040", 1]} />
        {perf && <Perf position="bottom-right" />}
        <RenderDungeon seed={Math.random()} />
        <CameraPositionLogger />

        <MinecraftSpectatorController speed={0.2} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
