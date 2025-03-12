import { XYZ } from "src/@types";

export const fullTile = 2;
export const halfTile = 1;

export type Position = [number, number, number];
export type Rotation = [number, number, number];
export type Component = {
  type: "floor" | "wall" | "arch";
  position: Position;
  rotation: Rotation;
};

export enum Directions {
  north = "north",
  east = "east",
  south = "south",
  west = "west",
}

export type DoorDirections = {
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

export const createSingleDoor = (direction: Directions): DoorDirections => {
  return {
    west: direction === Directions.west,
    south: direction === Directions.south,
    north: direction === Directions.north,
    east: direction === Directions.east,
  };
};

export const createDoors = (directions: Directions[]): DoorDirections => {
  const doors = { ...NoDoors };
  directions.forEach((direction) => {
    doors[direction] = true;
  });
  return doors;
};

export const calculateHallwayFloor = (
  length: number,
  width: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  for (let x = 0; x < length; x++) {
    for (let z = 0; z < width; z++) {
      components.push({
        type: "floor",
        position: [baseX + x * fullTile, baseY, baseZ + z * fullTile],
        rotation: [0, 0, 0],
      });
    }
  }

  return components;
};

export const calculateWallsX = (
  length: number,
  withDoor: boolean = false,
  basePosition: Position = [0, 0, 0],
  isFacingNorth: boolean = false
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  const zOffset = isFacingNorth ? halfTile : -halfTile;

  for (let x = 0; x < length; x++) {
    const wallX = baseX + x * fullTile;

    const bottomPos: Position = [wallX, baseY + halfTile, baseZ + zOffset];
    const middlePos: Position = [
      wallX,
      baseY + halfTile + fullTile,
      baseZ + zOffset,
    ];

    const topPos: Position = [
      wallX,
      baseY + halfTile + 2 * fullTile,
      baseZ + zOffset,
    ];

    const superTopPos: Position = [
      wallX,
      baseY + halfTile + 3 * fullTile,
      baseZ + zOffset,
    ];

    const placeArch = withDoor && x === Math.floor(length / 2);
    const cutoutDoor =
      withDoor &&
      (x === Math.floor(length / 2) ||
        x === Math.floor(length / 2) + 1 ||
        x === Math.floor(length / 2) - 1);

    if (placeArch) {
      components.push({
        type: "arch",
        position: [bottomPos[0], bottomPos[1] - halfTile, bottomPos[2]],
        rotation: [0, 0, 0],
      });
    } else if (!cutoutDoor) {
      components.push({
        type: "wall",
        position: bottomPos,
        rotation: [0, 0, 0],
      });

      components.push({
        type: "wall",
        position: middlePos,
        rotation: [0, 0, 0],
      });

      components.push({
        type: "wall",
        position: topPos,
        rotation: [0, 0, 0],
      });

      components.push({
        type: "wall",
        position: superTopPos,
        rotation: [0, 0, 0],
      });
    }
  }

  return components;
};

export const calculateWallsZ = (
  length: number,
  withDoor: boolean = false,
  basePosition: Position = [0, 0, 0],
  isFacingEast: boolean = false
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  const xOffset = isFacingEast ? -halfTile : halfTile;

  for (let z = 0; z < length; z++) {
    const wallZ = baseZ + z * fullTile;

    const bottomPos: Position = [baseX + xOffset, baseY + halfTile, wallZ];

    const middlePos: Position = [
      baseX + xOffset,
      baseY + halfTile + fullTile,
      wallZ,
    ];

    const topPos: Position = [
      baseX + xOffset,
      baseY + halfTile + 2 * fullTile,
      wallZ,
    ];

    const superTopPos: Position = [
      baseX + xOffset,
      baseY + halfTile + 3 * fullTile,
      wallZ,
    ];

    const placeArch = withDoor && z === Math.floor(length / 2);
    const cutoutDoor =
      withDoor &&
      (z === Math.floor(length / 2) ||
        z === Math.floor(length / 2) + 1 ||
        z === Math.floor(length / 2) - 1);

    if (placeArch) {
      components.push({
        type: "arch",
        position: [bottomPos[0], bottomPos[1] - halfTile, bottomPos[2]],
        rotation: [0, Math.PI / 2, 0],
      });

      // components.push({
      //   type: "wall",
      //   position: topPos,
      //   rotation: [0, Math.PI / 2, 0],
      // });
    } else if (!cutoutDoor) {
      components.push({
        type: "wall",
        position: bottomPos,
        rotation: [0, Math.PI / 2, 0],
      });

      components.push({
        type: "wall",
        position: topPos,
        rotation: [0, Math.PI / 2, 0],
      });

      components.push({
        type: "wall",
        position: middlePos,
        rotation: [0, Math.PI / 2, 0],
      });
      components.push({
        type: "wall",
        position: superTopPos,
        rotation: [0, Math.PI / 2, 0],
      });
    }
  }

  return components;
};

const hallWidth = 3;

export const calculateHallwayWallsX = (
  length: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  components.push(
    ...calculateWallsX(length, false, [baseX, baseY, baseZ], false)
  );

  components.push(
    ...calculateWallsX(
      length,
      false,
      [baseX, baseY, baseZ + (hallWidth - 1) * fullTile],
      true
    )
  );

  return components;
};

export const calculateHallwayWallsZ = (
  length: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  components.push(
    ...calculateWallsZ(length, false, [baseX - fullTile, baseY, baseZ], false)
  );

  components.push(
    ...calculateWallsZ(
      length,
      false,
      [baseX + length * fullTile, baseY, baseZ],
      true
    )
  );

  return components;
};

export const calculateHallwayX = (
  length: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];

  components.push(...calculateHallwayFloor(length, hallWidth, basePosition));
  components.push(...calculateHallwayWallsX(length, basePosition));

  return components;
};

export const calculateHallwayZ = (
  length: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];

  components.push(...calculateHallwayFloor(hallWidth, length, basePosition));
  components.push(...calculateHallwayWallsZ(length, basePosition));

  return components;
};

export const calculateRoomSquare = (
  size: number,
  doors: DoorDirections = NoDoors,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  components.push(...calculateFloorSquare(size, basePosition));

  components.push(
    ...calculateWallsX(size, doors.south, [baseX, baseY, baseZ], false)
  );

  components.push(
    ...calculateWallsX(
      size,
      doors.north,
      [baseX, baseY, baseZ + (size - 1) * fullTile],
      true
    )
  );

  components.push(
    ...calculateWallsZ(
      size,
      doors.west,
      [baseX - fullTile, baseY, baseZ],
      false
    )
  );

  components.push(
    ...calculateWallsZ(
      size,
      doors.east,
      [baseX + size * fullTile, baseY, baseZ],
      true
    )
  );

  return components;
};

export const calculateFloorSquare = (
  size: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  return calculateHallwayFloor(size, size, basePosition);
};

export const calculateDungeonLayout = (): Component[] => {
  const components: Component[] = [];

  components.push(
    ...calculateRoomSquare(11, createSingleDoor(Directions.west), [0, 0, 0])
  );

  components.push(
    ...calculateRoomSquare(5, createSingleDoor(Directions.east), [
      -fullTile * 7,
      0,
      3 * fullTile,
    ])
  );

  components.push(...calculateHallwayX(2, [-fullTile * 2, 0, 4 * fullTile]));

  return components;
};

export const convertLayoutToPositions = (layout: Component[]) => {
  const output = layout.reduce(
    (agg, component) => {
      const [x, y, z] = component.position;
      const [rx, ry, rz] = component.rotation;

      if (component.type === "floor") {
        return {
          ...agg,
          floors: {
            positions: [...agg.floors.positions, { x, y, z }],
            rotations: [...agg.floors.rotations, { x: rx, y: ry, z: rz }],
          },
        };
      }
      if (component.type === "wall") {
        return {
          ...agg,
          walls: {
            positions: [...agg.walls.positions, { x, y, z }],
            rotations: [...agg.walls.rotations, { x: rx, y: ry, z: rz }],
          },
        };
      }
      if (component.type === "arch") {
        return {
          ...agg,
          arches: {
            positions: [...agg.arches.positions, { x, y, z }],
            rotations: [...agg.arches.rotations, { x: rx, y: ry, z: rz }],
          },
        };
      }

      return { ...agg };
    },
    {
      floors: {
        positions: [],
        rotations: [],
      },
      walls: {
        positions: [],
        rotations: [],
      },
      arches: {
        positions: [],
        rotations: [],
      },
    } as {
      floors: { positions: XYZ[]; rotations: XYZ[] };
      walls: { positions: XYZ[]; rotations: XYZ[] };
      arches: { positions: XYZ[]; rotations: XYZ[] };
    }
  );

  return output;
};
