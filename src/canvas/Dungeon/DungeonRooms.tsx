import {
  Arch,
  Floor_Modular,
  Wall_Modular,
} from "@r3f/models/modular_dungeon_pack_1";
import { GroupProps } from "@react-three/fiber";

const fullTile = 2;
const halfTile = 1;

export const HallwayFloor = ({
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

type WallSegment = [number, number, number];
type Wall = { down: WallSegment; up: WallSegment };

export const Walls = ({
  length,
  withDoor,
  ...rest
}: GroupProps & { length: number; withDoor?: boolean }) => {
  const walls: Wall[] = [];

  for (let x = 0; x < length; x++) {
    walls.push({
      down: [x * fullTile, halfTile, -halfTile],
      up: [x * fullTile, halfTile + fullTile, -halfTile],
    });
  }

  return (
    <group {...rest}>
      {walls.map((position, index) => {
        if (withDoor && index === Math.floor(walls.length / 2)) {
          return (
            <Arch
              key={index}
              scale-x={0.8}
              position={position.down}
              position-y={position.down[1] - halfTile}
            />
          );
        }

        return (
          <>
            <Wall_Modular key={index} position={position.down} />
            <Wall_Modular key={index} position={position.up} />
          </>
        );
      })}
    </group>
  );
};

export const HallwayWalls = ({
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

export const Hallway = ({
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

enum Directions {
  north = "north",
  east = "east",
  south = "south",
  west = "west",
}

type DoorDirections = {
  [Directions.north]: boolean;
  [Directions.east]: boolean;
  [Directions.south]: boolean;
  [Directions.west]: boolean;
};

const NoDoors: DoorDirections = {
  west: false,
  south: false,
  north: false,
  east: false,
};
export const createSingleDoor = (direction: Directions) => {
  return {
    west: direction === Directions.west,
    south: direction === Directions.south,
    north: direction === Directions.north,
    east: direction === Directions.east,
  };
};

export const createDoors = (directions: Directions[]) => {
  const doors = { ...NoDoors };
  directions.forEach((direction) => {
    doors[direction] = true;
  });

  return doors;
};

export const RoomSquare = ({
  size,
  doors = NoDoors,
  ...rest
}: GroupProps & {
  size: number;
  doors?: DoorDirections;
}) => {
  const realSize = size;
  return (
    <group {...rest}>
      <FloorSquare size={realSize} />
      <Walls position={[0, 0, 0]} length={realSize} withDoor={doors.south} />
      <Walls
        position={[0, 0, realSize * fullTile]}
        length={realSize}
        withDoor={doors.north}
      />
      <Walls
        rotation={[0, Math.PI / 2, 0]}
        position={[0, 0, fullTile * realSize - fullTile]}
        length={realSize}
        withDoor={doors.east}
      />
      <Walls
        rotation={[0, Math.PI / 2, 0]}
        position={[realSize * fullTile, 0, fullTile * realSize - fullTile]}
        length={realSize}
        withDoor={doors.west}
      />
    </group>
  );
};

export const FloorSquare = ({
  size,
  ...rest
}: GroupProps & { size: number }) => {
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

export const DungeonRooom = () => {
  return (
    <group>
      {/* <Floor_Modular position={[0, 0, 0]} />
      <Floor_Modular position={[0, 0, fullTile]} />
      <Floor_Modular position={[fullTile, 0, fullTile]} />
      <Floor_Modular position={[fullTile, 0, 0]} /> */}
      {/* <FloorSquare size={2} /> */}
      <RoomSquare size={11} doors={createSingleDoor(Directions.east)} />
      <RoomSquare
        size={5}
        position={[-fullTile * 7, 0, 3 * fullTile]}
        doors={createSingleDoor(Directions.west)}
      />
      <Hallway
        length={2}
        width={3}
        position={[-fullTile * 2, 0, 4 * fullTile]}
      />

      {/* <HallwayFloor length={10} width={2} position={[fullTile * 2, 0, 0]} /> */}
      {/* <Hallway length={10} width={2} position={[fullTile * 2, 0, 0]} /> */}

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
