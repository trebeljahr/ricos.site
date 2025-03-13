import { ThreeFiberLayout } from "@components/dom/Layout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { DungeonGenerator3D } from "@r3f/Dungeon/DungeonGenerator3D/Generator";
import { CellType3D, Vector3Int } from "@r3f/Dungeon/DungeonGenerator3D/Types";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from "three";

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
  const { camera } = useThree();
  const roomInstancesRef = useRef<InstancedMesh>(null!);
  const hallwayInstancesRef = useRef<InstancedMesh>(null!);
  const stairsInstancesRef = useRef<InstancedMesh>(null!);

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

  useEffect(() => {
    console.log(grid3D);

    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);

    const centerOffset = new Vector3(
      -grid3D.size.x / 2,
      -grid3D.size.y / 2,
      -grid3D.size.z / 2
    );

    camera.position.set(grid3D.size.x, grid3D.size.y * 1.5, grid3D.size.z);
    camera.lookAt(0, 0, 0);

    const roomInstances = roomInstancesRef.current;
    const hallwayInstances = hallwayInstancesRef.current;
    const stairsInstances = stairsInstancesRef.current;

    const matrix = new Matrix4();

    let roomInstancesCount = 0;
    let hallwayInstancesCount = 0;
    let stairsInstancesCount = 0;

    grid3D.forEach((pos, cellType) => {
      if (cellType === CellType3D.None) return;

      const worldPos = new Vector3(
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

    roomInstances.castShadow = true;
    roomInstances.receiveShadow = true;
    hallwayInstances.castShadow = true;
    hallwayInstances.receiveShadow = true;
    stairsInstances.castShadow = true;
    stairsInstances.receiveShadow = true;
  });

  return (
    <group position={[25, -0.1, 25]}>
      <ambientLight args={["#404040", 1]} />
      <directionalLight args={["#ffffff", 0.8]} position={[50, 50, 50]} />
      <color attach="background" args={["#222222"]} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[grid3D.size.x, grid3D.size.z]} />
        <meshStandardMaterial
          color={"#333333"}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

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
      <CanvasWithKeyboardInput camera={{ position: [25, 30, 25] }}>
        <OrbitControls target={[25, 0, 25]} />
        <ambientLight args={["#404040", 1]} />
        <directionalLight args={["#ffffff", 0.8]} position={[50, 50, 50]} />
        <color attach="background" args={["#222222"]} />
        <RenderDungeon />
        <gridHelper position={[24.5, 0, 24.5]} args={[50, 50]} />
      </CanvasWithKeyboardInput>
      <button onClick={handleClick} className="absolute top-0 right-0 z-20">
        Click for new dungeon
      </button>
    </ThreeFiberLayout>
  );
}
