import { ThreeFiberLayout } from "@components/dom/Layout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { DungeonGenerator3D } from "@r3f/Dungeon/DungeonGenerator3D/Generator";
import {
  CellType3D,
  Vector3,
  Vector3Int,
} from "@r3f/Dungeon/DungeonGenerator3D/Types";
import { OrbitControls, Sky } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3 as Vector3FromThreeJS,
} from "three";
import {
  DungeonMeshGenerator,
  MeshType,
} from "@r3f/Dungeon/DungeonGenerator3D/ConvertToMesh";
import { Arches, Floors, Walls } from "@r3f/Dungeon/DungeonRoomsWithInstancing";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import {
  useKeyboardInput,
  useSubscribeToKeyPress,
} from "@hooks/useKeyboardInput";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";

const materials = {
  room: new MeshStandardMaterial({
    color: "#cd5c5c",
    roughness: 0.7,
    metalness: 0.2,
  }),
  hallway: new MeshStandardMaterial({
    color: "#4682b4",
    roughness: 0.5,
    metalness: 0.3,
  }),
  stairs: new MeshStandardMaterial({
    color: "#2e8b57",
    roughness: 0.6,
    metalness: 0.3,
  }),
};

const geometries = {
  room: new BoxGeometry(1, 1, 1),
  hallway: new BoxGeometry(1, 1, 1),
  stairs: new BoxGeometry(1, 1, 1),
};

const RenderDungeon = () => {
  const [showDebug, setShowDebug] = useState(true);

  const roomInstancesRef = useRef<InstancedMesh>(null!);
  const hallwayInstancesRef = useRef<InstancedMesh>(null!);
  const stairsInstancesRef = useRef<InstancedMesh>(null!);

  const handleDebug = () => {
    setShowDebug((prev) => !prev);
  };

  useSubscribeToKeyPress("f", handleDebug);
  console.log("rendering dungeon");

  const generator3D = new DungeonGenerator3D(
    new Vector3Int(50, 5, 50),
    30,
    new Vector3Int(6, 1, 6),
    Math.random() * 1000
  );

  const grid3D = generator3D.generate();

  const counts = grid3D.data.reduce(
    (acc, cellType) => {
      if (cellType === CellType3D.None) return acc;

      switch (cellType) {
        case CellType3D.Room:
          acc.room++;
          break;
        case CellType3D.Hallway:
          acc.hallway++;
          break;
        case CellType3D.Stairs:
          acc.stairs++;
          break;
      }

      return acc;
    },
    { room: 0, hallway: 0, stairs: 0 }
  );

  console.log(counts);

  const meshes = DungeonMeshGenerator.generateMeshes(grid3D);
  console.log(meshes);

  const renderPass = meshes.reduce(
    (acc, mesh) => {
      switch (mesh.meshType) {
        case MeshType.Door:
          return {
            ...acc,
            doors: {
              ...acc.doors,
              positions: [...acc.doors.positions, mesh.position],
              rotations: [...acc.doors.rotations, mesh.rotation],
            },
          };
        case MeshType.DoorFrame:
          return {
            ...acc,
            doorFrames: {
              ...acc.doorFrames,
              positions: [...acc.doorFrames.positions, mesh.position],
              rotations: [...acc.doorFrames.rotations, mesh.rotation],
            },
          };
        case MeshType.Stairs:
          return {
            ...acc,
            stairs: {
              ...acc.stairs,
              positions: [...acc.stairs.positions, mesh.position],
              rotations: [...acc.stairs.rotations, mesh.rotation],
            },
          };
        case MeshType.StairsRailing:
          return {
            ...acc,
            stairsRailing: {
              ...acc.stairsRailing,
              positions: [...acc.stairsRailing.positions, mesh.position],
              rotations: [...acc.stairsRailing.rotations, mesh.rotation],
            },
          };
        case MeshType.Wall:
          return {
            ...acc,
            walls: {
              ...acc.walls,
              positions: [...acc.walls.positions, mesh.position],
              rotations: [...acc.walls.rotations, mesh.rotation],
            },
          };
        case MeshType.Ceiling:
          return {
            ...acc,
            ceilings: {
              ...acc.ceilings,
              positions: [...acc.ceilings.positions, mesh.position],
              rotations: [...acc.ceilings.rotations, mesh.rotation],
            },
          };
        case MeshType.Floor:
          return {
            ...acc,
            floors: {
              ...acc.floors,
              positions: [...acc.floors.positions, mesh.position],
              rotations: [...acc.floors.rotations, mesh.rotation],
            },
          };
      }
    },
    {
      walls: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
      ceilings: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
      floors: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
      doors: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
      doorFrames: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
      stairs: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
      stairsRailing: { positions: [], rotations: [] } as {
        positions: Vector3[];
        rotations: Vector3[];
      },
    }
  );

  console.log(renderPass);

  useEffect(() => {
    const roomInstances = roomInstancesRef.current;
    const hallwayInstances = hallwayInstancesRef.current;
    const stairsInstances = stairsInstancesRef.current;

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
      }
    });

    roomInstances.instanceMatrix.needsUpdate = true;
    hallwayInstances.instanceMatrix.needsUpdate = true;
    stairsInstances.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[grid3D.size.x / 2, -0.1, grid3D.size.z / 2]} scale={4}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[grid3D.size.x, grid3D.size.z]} />
        <meshStandardMaterial
          color={"#333333"}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <gridHelper args={[grid3D.size.x, grid3D.size.z]} position-y={0.1} />

      {showDebug ? (
        <>
          <instancedMesh
            args={[geometries.room, materials.room, counts.room]}
            ref={roomInstancesRef}
            frustumCulled={false}
          />
          <instancedMesh
            args={[geometries.hallway, materials.hallway, counts.hallway]}
            ref={hallwayInstancesRef}
            frustumCulled={false}
          />
          <instancedMesh
            args={[geometries.stairs, materials.stairs, counts.stairs]}
            ref={stairsInstancesRef}
            frustumCulled={false}
          />
        </>
      ) : (
        <group position={[-grid3D.size.x / 2, 0, -grid3D.size.z / 2]}>
          <Arches {...renderPass.doorFrames} />
          <Walls {...renderPass.walls} />
          <Floors {...renderPass.floors} />
          <Floors {...renderPass.ceilings} />
        </group>
      )}
    </group>
  );
};

export default function Page() {
  const [state, setState] = useState(0);

  const handleClick = () => {
    setState((prev) => prev + 1);
  };

  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput camera={{ near: 0.001, position: [25, 10, 25] }}>
        <ambientLight args={["#404040", 1]} />
        <directionalLight args={["#ffffff", 0.8]} position={[50, 50, 50]} />
        <Sky />
        <RenderDungeon />
        <CameraPositionLogger />

        <MinecraftSpectatorController speed={0.2} />
      </CanvasWithKeyboardInput>
      <button onClick={handleClick} className="absolute top-0 right-0 z-20">
        Click for new dungeon
      </button>
    </ThreeFiberLayout>
  );
}
