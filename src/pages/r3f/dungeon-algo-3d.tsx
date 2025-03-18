import { ThreeFiberLayout } from "@components/dom/Layout";
import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";
import { perf, wireframe } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
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
import {
  Arches,
  Coins,
  Floors,
  Railings,
  SideWallStairs,
  Stairs,
  Torches,
  Walls,
} from "@r3f/Dungeon/DungeonRoomsWithInstancing";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import { Sky } from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { Perf } from "r3f-perf";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3 as Vector3FromThreeJS,
} from "three";

const backgroundColor = "#191616";
const viewDistance = 300;

const materials = {
  room: new MeshStandardMaterial({
    color: "#cd5c5c",
    roughness: 0.7,
    metalness: 0.2,
    wireframe,
  }),
  hallway: new MeshStandardMaterial({
    color: "#4682b4",
    roughness: 0.5,
    metalness: 0.3,
    wireframe,
  }),
  stairs: new MeshStandardMaterial({
    color: "#2e8b57",
    roughness: 0.6,
    metalness: 0.3,
    wireframe,
  }),
  door: new MeshStandardMaterial({
    color: "#ffe601",
    roughness: 0.6,
    metalness: 0.3,
    wireframe,
  }),
};

const geometries = {
  room: new BoxGeometry(1, 1, 1),
  hallway: new BoxGeometry(1, 1, 1),
  stairs: new BoxGeometry(1, 1, 1),
  door: new BoxGeometry(1, 1, 1),
};

const RenderDungeon = ({ seed }: { seed?: number }) => {
  const [showDebug, setShowDebug] = useState(true);

  const roomInstancesRef = useRef<InstancedMesh>(null!);
  const hallwayInstancesRef = useRef<InstancedMesh>(null!);
  const stairsInstancesRef = useRef<InstancedMesh>(null!);
  const doorsInstancesRef = useRef<InstancedMesh>(null!);

  const handleDebug = () => {
    setShowDebug((prev) => !prev);
  };

  useSubscribeToKeyPress("f", handleDebug);

  const { generator3D, grid3D, renderPass, counts } = useMemo(() => {
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
    // renderPass[MeshType.Torch] = {
    //   positions: renderPass[MeshType.Wall].positions,
    //   rotations: renderPass[MeshType.Wall].rotations,
    // };

    return { generator3D, grid3D, renderPass, counts };
  }, [seed]);

  useEffect(() => {
    const roomInstances = roomInstancesRef.current;
    const hallwayInstances = hallwayInstancesRef.current;
    const stairsInstances = stairsInstancesRef.current;
    const doorsInstances = doorsInstancesRef.current;

    if (!roomInstances || !hallwayInstances || !stairsInstances) return;

    const centerOffset = new Vector3(
      -grid3D.size.x / 2,
      -grid3D.size.y / 2,
      -grid3D.size.z / 2
    );

    const matrix = new Matrix4();

    let roomInstancesCount = 0;
    let hallwayInstancesCount = 0;
    let stairsInstancesCount = 0;
    let doorsInstancesCount = 0;

    grid3D.forEach((pos, cellType) => {
      if (cellType === CellType3D.None) return;

      const worldPos = new Vector3FromThreeJS(
        pos.x + centerOffset.x,
        pos.y + 1,
        pos.z + centerOffset.z
      );

      matrix.setPosition(worldPos);

      switch (cellType) {
        case CellType3D.Room:
          roomInstances.setMatrixAt(roomInstancesCount++, matrix);
          break;
        case CellType3D.Hallway:
          hallwayInstances.setMatrixAt(hallwayInstancesCount++, matrix);
          break;
        case CellType3D.Stairs:
          stairsInstances.setMatrixAt(stairsInstancesCount++, matrix);
          break;
        case CellType3D.RoomCenterAxis:
          doorsInstances.setMatrixAt(doorsInstancesCount++, matrix);
          break;
      }
    });

    roomInstances.instanceMatrix.needsUpdate = true;
    hallwayInstances.instanceMatrix.needsUpdate = true;
    stairsInstances.instanceMatrix.needsUpdate = true;
    doorsInstances.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[grid3D.size.x / 2, -0.1, grid3D.size.z / 2]} scale={4}>
      <group position={[-0.5, 0, -0.5]}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[grid3D.size.x, grid3D.size.z]} />
          <meshStandardMaterial
            color={"#333333"}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>

        <gridHelper args={[grid3D.size.x, grid3D.size.z]} position-y={0.001} />
      </group>

      {showDebug ? (
        <>
          <instancedMesh
            args={[geometries.room, materials.room, counts.rooms]}
            ref={roomInstancesRef}
            frustumCulled={false}
          />
          <instancedMesh
            args={[geometries.door, materials.door, counts.doors]}
            ref={doorsInstancesRef}
            frustumCulled={false}
          />
          <instancedMesh
            args={[geometries.hallway, materials.hallway, counts.hallways]}
            ref={hallwayInstancesRef}
            frustumCulled={false}
          />
          <instancedMesh
            args={[geometries.stairs, materials.stairs, counts.stairs]}
            ref={stairsInstancesRef}
            frustumCulled={false}
          />
          <Sky />
          <directionalLight args={["#ffffff", 0.8]} position={[50, 50, 50]} />
        </>
      ) : (
        <group position={[-grid3D.size.x / 2, 1, -grid3D.size.z / 2]}>
          <Arches {...renderPass[MeshType.DoorFrame]} />
          <Walls {...renderPass[MeshType.Wall]} />
          <Coins {...renderPass[MeshType.Debug]} />
          <Torches {...renderPass[MeshType.Torch]} />
          <SideWallStairs {...renderPass[MeshType.StairWall]} />
          <Railings {...renderPass[MeshType.StairsRailing]} />
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
      )}
    </group>
  );
};

export default function Page() {
  const [seed, setSeed] = useState(0);

  const handleClick = () => {
    setSeed((prev) => prev + 1);
  };

  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput
        camera={{ far: viewDistance, position: [25, 10, 25] }}
      >
        {/* <fog attach="fog" args={[backgroundColor, 5, viewDistance]} /> */}
        {/* <color attach="background" args={[backgroundColor]} /> */}

        <ambientLight args={["#404040", 1]} />
        {perf && <Perf position="bottom-right" />}
        <RenderDungeon seed={seed} />
        <CameraPositionLogger />

        <MinecraftSpectatorController speed={0.2} />
      </CanvasWithKeyboardInput>
      {/* <button onClick={handleClick} className="absolute top-0 right-0 z-20">
        Click for new dungeon
      </button> */}
    </ThreeFiberLayout>
  );
}
