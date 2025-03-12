// Constants
const fullTile = 2;
const halfTile = 1;

export enum Directions {
  north = "north",
  east = "east",
  south = "south",
  west = "west",
}

// Types
export type Position = [number, number, number];
export type Rotation = [number, number, number];
export type Component = {
  type: "floor" | "wall" | "arch";
  position: Position;
  rotation?: Rotation;
};

export type DoorDirections = {
  [Directions.north]: boolean;
  [Directions.east]: boolean;
  [Directions.south]: boolean;
  [Directions.west]: boolean;
};

export const NoDoors: DoorDirections = {
  west: false,
  south: false,
  north: false,
  east: false,
};

// Helper functions
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

// Layout calculators
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
      });
    }
  }

  return components;
};

export const calculateWalls = (
  length: number,
  withDoor: boolean = false,
  basePosition: Position = [0, 0, 0],
  rotation: Rotation = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  for (let x = 0; x < length; x++) {
    const downWallPosition: Position = [
      baseX + x * fullTile,
      baseY + halfTile,
      baseZ - halfTile,
    ];
    const upWallPosition: Position = [
      baseX + x * fullTile,
      baseY + halfTile + fullTile,
      baseZ - halfTile,
    ];

    if (withDoor && x === Math.floor(length / 2)) {
      components.push({
        type: "arch",
        position: [
          downWallPosition[0],
          downWallPosition[1] - halfTile,
          downWallPosition[2],
        ],
        rotation,
      });
    } else {
      components.push({
        type: "wall",
        position: downWallPosition,
        rotation,
      });

      components.push({
        type: "wall",
        position: upWallPosition,
        rotation,
      });
    }
  }

  return components;
};

export const calculateHallwayWalls = (
  length: number,
  width: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  // South wall
  components.push(
    ...calculateWalls(length, false, [baseX, baseY, baseZ], [0, 0, 0])
  );

  // North wall
  components.push(
    ...calculateWalls(
      length,
      false,
      [baseX, baseY, baseZ + width * fullTile],
      [0, 0, 0]
    )
  );

  return components;
};

export const calculateHallway = (
  length: number,
  width: number,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];

  components.push(...calculateHallwayFloor(length, width, basePosition));
  components.push(...calculateHallwayWalls(length, width, basePosition));

  return components;
};

export const calculateRoomSquare = (
  size: number,
  doors: DoorDirections = NoDoors,
  basePosition: Position = [0, 0, 0]
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  // Floor
  components.push(...calculateFloorSquare(size, basePosition));

  // South wall
  components.push(
    ...calculateWalls(size, doors.south, [baseX, baseY, baseZ], [0, 0, 0])
  );

  // North wall
  components.push(
    ...calculateWalls(
      size,
      doors.north,
      [baseX, baseY, baseZ + size * fullTile],
      [0, 0, 0]
    )
  );

  // East wall
  components.push(
    ...calculateWalls(
      size,
      doors.east,
      [baseX, baseY, baseZ + fullTile * size - fullTile],
      [0, Math.PI / 2, 0]
    )
  );

  // West wall
  components.push(
    ...calculateWalls(
      size,
      doors.west,
      [baseX + size * fullTile, baseY, baseZ + fullTile * size - fullTile],
      [0, Math.PI / 2, 0]
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

// Example usage function
export const calculateDungeonLayout = (): Component[] => {
  const components: Component[] = [];

  // Main room
  components.push(
    ...calculateRoomSquare(11, createSingleDoor(Directions.east), [0, 0, 0])
  );

  // Side room
  components.push(
    ...calculateRoomSquare(5, createSingleDoor(Directions.west), [
      -fullTile * 7,
      0,
      3 * fullTile,
    ])
  );

  // Hallway connecting rooms
  components.push(...calculateHallway(2, 3, [-fullTile * 2, 0, 4 * fullTile]));

  return components;
};
