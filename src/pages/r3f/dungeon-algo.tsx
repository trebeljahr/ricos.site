import { ThreeFiberLayout } from "@components/dom/Layout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { DungeonGenerator } from "@r3f/Dungeon/Generator2D/Generator";
import { CellType, Vector2Int } from "@r3f/Dungeon/Generator2D/TypeStructure";
import { DungeonGenerator3D } from "@r3f/Dungeon/Generator3D/Generator";
import { Vector3Int } from "@r3f/Dungeon/Generator3D/Types";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import { BoxGeometry, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";

export default function Page() {
  const [state, setState] = useState(0);

  const handleClick = () => {
    setState((prev) => prev + 1);
  };

  const size = new Vector2Int(50, 50);
  const generator = new DungeonGenerator(
    size,
    20,
    new Vector2Int(8, 8),
    Math.random() * 1000
  );

  const grid = generator.generate();

  const roomMaterial = new MeshStandardMaterial({
    color: "#cd5c5c",
    roughness: 0.7,
    metalness: 0.2,
  });

  const hallwayMaterial = new MeshStandardMaterial({
    color: "#4682b4",
    roughness: 0.5,
    metalness: 0.3,
  });

  const roomGeometry = new BoxGeometry(1, 0.5, 1);
  const hallwayGeometry = new BoxGeometry(1, 0.3, 1);

  const meshes = [];

  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      const pos = new Vector2Int(x, y);
      const cellType = grid.getValue(pos);

      let mesh: Mesh | null = null;

      if (cellType === CellType.Room) {
        mesh = new Mesh(roomGeometry, roomMaterial);
      } else if (cellType === CellType.Hallway) {
        mesh = new Mesh(hallwayGeometry, hallwayMaterial);
      }

      if (mesh) {
        mesh.position.set(x, 0, y);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.push(mesh);
      }
    }
  }

  const floorGeometry = new PlaneGeometry(size.x, size.y);
  const floorMaterial = new MeshStandardMaterial({
    color: "#333333",
    roughness: 0.9,
    metalness: 0.1,
  });

  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput
        camera-position={[25, 30, 25]}
        camera-lookAt={[25, 0, 25]}
      >
        <OrbitControls target={[25, 0, 25]} />
        <ambientLight args={["#404040", 1]} />
        <directionalLight args={["#ffffff", 0.8]} position={[50, 50, 50]} />
        <color attach="background" args={["#222222"]} />
        <mesh
          geometry={floorGeometry}
          material={floorMaterial}
          rotation-x={-Math.PI / 2}
          position={[size.x / 2 - 0.5, -0.25, size.y / 2 - 0.5]}
          receiveShadow
        />
        {meshes.map((mesh, index) => (
          <primitive key={index} object={mesh} />
        ))}
        <gridHelper position={[24.5, 0, 24.5]} args={[50, 50]} />
      </CanvasWithKeyboardInput>
      <button onClick={handleClick} className="absolute top-0 right-0 z-20">
        Click for new dungeon
      </button>
    </ThreeFiberLayout>
  );
}
