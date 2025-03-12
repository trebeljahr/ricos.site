import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  Arch,
  Arch_Door,
  Floor_Modular,
  Wall_Modular,
} from "@r3f/models/modular_dungeon_pack_1";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas, GroupProps } from "@react-three/fiber";

const fullTile = 2;
const halfTile = 1;

const HallwayFloor = ({
  length,
  width,
  ...rest
}: GroupProps & { length: number; width: number }) => {
  const tileOffsets = [];
  for (let x = 0; x < length; x++) {
    for (let z = 0; z < width; z++) {
      tileOffsets.push([x, z]);
    }
  }

  return (
    <group {...rest}>
      {tileOffsets.map(([x, z], index) => (
        <Floor_Modular key={index} position={[x * fullTile, 0, z * fullTile]} />
      ))}
    </group>
  );
};

const Walls = ({ length, ...rest }: GroupProps & { length: number }) => {
  const walls: [number, number, number][] = [];
  for (let x = 0; x < length; x++) {
    walls.push([x * fullTile, halfTile, -halfTile]);
    walls.push([x * fullTile, halfTile + fullTile, -halfTile]);
  }

  return (
    <group {...rest}>
      {walls.map((position, index) => (
        <Wall_Modular key={index} position={position} />
      ))}
    </group>
  );
};

const HallwayWalls = ({
  length,
  width,
  ...rest
}: GroupProps & { length: number; width: number }) => {
  return (
    <group {...rest}>
      <Walls position={[0, 0, 0]} length={length} />
      <Walls position={[0, 0, width * fullTile]} length={length} />
    </group>
  );
};

const Hallway = ({
  length: length,
  width: width,
  ...rest
}: GroupProps & { length: number; width: number }) => {
  return (
    <group {...rest}>
      <HallwayFloor length={length} width={width} />
      <HallwayWalls length={length} width={width} />
    </group>
  );
};

const RoomSquare = ({ size, ...rest }: GroupProps & { size: number }) => {
  const realSize = size;
  return (
    <group {...rest}>
      <FloorSquare size={realSize} />
      <Walls position={[0, 0, 0]} length={realSize} />
      <Walls position={[0, 0, realSize * fullTile]} length={realSize} />
      <Walls
        rotation={[0, Math.PI / 2, 0]}
        position={[0, 0, fullTile * realSize - fullTile]}
        length={realSize}
      />
      <Walls
        rotation={[0, Math.PI / 2, 0]}
        position={[realSize * fullTile, 0, fullTile * realSize - fullTile]}
        length={realSize}
      />
      {/* <Walls
        rotation={[0, Math.PI / 2, 0]}
        position={[0, 0, realSize * fullTile]}
        length={realSize}
      /> */}
    </group>
  );
};

const FloorSquare = ({ size, ...rest }: GroupProps & { size: number }) => {
  const tileOffsets = [];
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      tileOffsets.push([x, z]);
    }
  }

  return (
    <group {...rest}>
      {tileOffsets.map(([x, z], index) => (
        <Floor_Modular key={index} position={[x * fullTile, 0, z * fullTile]} />
      ))}
    </group>
  );
};

const DungeonRooom = () => {
  return (
    <group>
      {/* <Floor_Modular position={[0, 0, 0]} />
      <Floor_Modular position={[0, 0, fullTile]} />
      <Floor_Modular position={[fullTile, 0, fullTile]} />
      <Floor_Modular position={[fullTile, 0, 0]} /> */}
      {/* <FloorSquare size={2} /> */}
      {/* <RoomSquare size={10} /> */}

      {/* <HallwayFloor length={10} width={2} position={[fullTile * 2, 0, 0]} /> */}
      <Hallway length={10} width={2} position={[fullTile * 2, 0, 0]} />

      {/* <Wall_Modular
        position={[fullTile, fullTile / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      <Arch_Door
        position={[halfTile + fullTile, 0, halfTile]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <Arch
        position={[halfTile + fullTile, 0, halfTile]}
        rotation={[0, Math.PI / 2, 0]}
      /> */}
    </group>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas>
        {/* <ambientLight intensity={2} /> */}
        <color attach="background" args={["#fbf1d1"]} />

        <Stage>
          <DungeonRooom />
        </Stage>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
