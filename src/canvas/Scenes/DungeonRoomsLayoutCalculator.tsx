// Constants
const fullTile = 2;
const halfTile = 1;

// Types
export type Position = [number, number, number];
export type Rotation = [number, number, number];
export type Component = {
  type: "floor" | "wall" | "arch";
  position: Position;
  rotation?: Rotation;
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

// Calculate walls along the X-axis (facing north or south)
export const calculateWallsX = (
  length: number,
  withDoor: boolean = false,
  basePosition: Position = [0, 0, 0],
  isFacingNorth: boolean = false
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  // Adjust the z-coordinate based on which direction the wall is facing
  const zOffset = isFacingNorth ? halfTile : -halfTile;

  for (let x = 0; x < length; x++) {
    const wallX = baseX + x * fullTile;

    // Bottom wall segment
    const bottomPos: Position = [wallX, baseY + halfTile, baseZ + zOffset];

    // Top wall segment
    const topPos: Position = [
      wallX,
      baseY + halfTile + fullTile,
      baseZ + zOffset,
    ];

    if (withDoor && x === Math.floor(length / 2)) {
      // Place arch for door
      components.push({
        type: "arch",
        position: [bottomPos[0], bottomPos[1] - halfTile, bottomPos[2]],
        rotation: [0, 0, 0], // No rotation for north/south facing walls
      });
    } else {
      // Place regular wall segments
      components.push({
        type: "wall",
        position: bottomPos,
        rotation: [0, 0, 0],
      });

      components.push({
        type: "wall",
        position: topPos,
        rotation: [0, 0, 0],
      });
    }
  }

  return components;
};

// Calculate walls along the Z-axis (facing east or west)
export const calculateWallsZ = (
  length: number,
  withDoor: boolean = false,
  basePosition: Position = [0, 0, 0],
  isFacingEast: boolean = false
): Component[] => {
  const components: Component[] = [];
  const [baseX, baseY, baseZ] = basePosition;

  // Adjust the x-coordinate based on which direction the wall is facing
  const xOffset = isFacingEast ? -halfTile : halfTile;

  for (let z = 0; z < length; z++) {
    const wallZ = baseZ + z * fullTile;

    // Bottom wall segment
    const bottomPos: Position = [baseX + xOffset, baseY + halfTile, wallZ];

    // Top wall segment
    const topPos: Position = [
      baseX + xOffset,
      baseY + halfTile + fullTile,
      wallZ,
    ];

    if (withDoor && z === Math.floor(length / 2)) {
      // Place arch for door - note the rotation for east/west facing walls
      components.push({
        type: "arch",
        position: [bottomPos[0], bottomPos[1] - halfTile, bottomPos[2]],
        rotation: [0, Math.PI / 2, 0], // Rotate for east/west facing walls
      });
    } else {
      // Place regular wall segments
      components.push({
        type: "wall",
        position: bottomPos,
        rotation: [0, Math.PI / 2, 0], // Rotate for east/west facing walls
      });

      components.push({
        type: "wall",
        position: topPos,
        rotation: [0, Math.PI / 2, 0], // Rotate for east/west facing walls
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
    ...calculateWallsX(length, false, [baseX, baseY, baseZ], false)
  );

  // North wall
  components.push(
    ...calculateWallsX(
      length,
      false,
      [baseX, baseY, baseZ + (width - 1) * fullTile],
      true
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

  // South wall (along x-axis at z=0, facing south)
  components.push(
    ...calculateWallsX(size, doors.south, [baseX, baseY, baseZ], false)
  );

  // North wall (along x-axis at z=size*fullTile, facing north)
  components.push(
    ...calculateWallsX(
      size,
      doors.north,
      [baseX, baseY, baseZ + (size - 1) * fullTile],
      true
    )
  );

  // West wall (along z-axis at x=0, facing west)
  components.push(
    ...calculateWallsZ(
      size,
      doors.west,
      [baseX - fullTile, baseY, baseZ],
      false
    )
  );

  // East wall (along z-axis at x=size*fullTile, facing east)
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

// Example usage function
export const calculateDungeonLayout = (): Component[] => {
  const components: Component[] = [];

  // Main room
  components.push(
    ...calculateRoomSquare(11, createSingleDoor(Directions.west), [0, 0, 0])
  );

  // Side room
  components.push(
    ...calculateRoomSquare(5, createSingleDoor(Directions.east), [
      -fullTile * 7,
      0,
      3 * fullTile,
    ])
  );

  // Hallway connecting rooms
  components.push(...calculateHallway(2, 3, [-fullTile * 2, 0, 4 * fullTile]));

  return components;
};
