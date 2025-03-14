import { getRandomIntUneven } from "src/lib/utils/misc";
import {
  calculateHallwayX,
  calculateHallwayZ,
  calculateRoomSquare,
  Component,
  Directions,
  DoorDirections,
  fullTile,
  Position,
} from "./DungeonRoomsLayoutCalculator";

type RoomType = "small" | "medium" | "large" | "hall";

interface Room {
  id: number;
  type: RoomType;
  size: number;
  position: Position;
  connections: Connection[];
  doors: DoorDirections;
}

interface Connection {
  fromRoom: number;
  toRoom: number;
  direction: Directions;
  corridorLength?: number;
  corridorWidth?: number;
}

interface DungeonConfig {
  minRooms: number;
  maxRooms: number;
  roomDistribution: {
    small: number;
    medium: number;
    large: number;
    hall: number;
  };
  corridorWidthRange: [number, number];
  corridorLengthRange: [number, number];
  sparseness: number;
  complexity: number;
  torches: boolean;
  torchInterval: number;
}

const defaultConfig: DungeonConfig = {
  minRooms: 5,
  maxRooms: 10,
  torches: true,
  torchInterval: 3,
  roomDistribution: {
    small: 40,
    medium: 30,
    large: 20,
    hall: 10,
  },
  corridorWidthRange: [1, 3],
  corridorLengthRange: [1, 5],
  sparseness: 60,
  complexity: 50,
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getWeightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) {
      return items[i];
    }
    random -= weights[i];
  }

  return items[items.length - 1];
}

function getRandomRoomType(config: DungeonConfig): RoomType {
  const types: RoomType[] = ["small", "medium", "large", "hall"];
  const weights = [
    config.roomDistribution.small,
    config.roomDistribution.medium,
    config.roomDistribution.large,
    config.roomDistribution.hall,
  ];

  return getWeightedRandom(types, weights);
}

function getRoomSize(type: RoomType): number {
  switch (type) {
    case "small":
      return getRandomIntUneven(5, 9);
    case "medium":
      return getRandomIntUneven(9, 13);
    case "large":
      return getRandomIntUneven(13, 17);
    case "hall":
      return getRandomIntUneven(17, 21);
    default:
      return 7;
  }
}

function isPositionAvailable(
  position: Position,
  size: number,
  rooms: Room[]
): boolean {
  const [x, y, z] = position;
  const roomBounds = {
    minX: x - 1,
    maxX: x + size * fullTile + 1,
    minZ: z - 1,
    maxZ: z + size * fullTile + 1,
  };

  for (const room of rooms) {
    const [rx, ry, rz] = room.position;
    const existingBounds = {
      minX: rx - 1,
      maxX: rx + room.size * fullTile + 1,
      minZ: rz - 1,
      maxZ: rz + room.size * fullTile + 1,
    };

    if (
      !(
        roomBounds.minX > existingBounds.maxX ||
        roomBounds.maxX < existingBounds.minX ||
        roomBounds.minZ > existingBounds.maxZ ||
        roomBounds.maxZ < existingBounds.minZ
      )
    ) {
      return false;
    }
  }

  return true;
}

function getOppositeDirection(direction: Directions): Directions {
  switch (direction) {
    case Directions.north:
      return Directions.south;
    case Directions.south:
      return Directions.north;
    case Directions.east:
      return Directions.west;
    case Directions.west:
      return Directions.east;
    default:
      return Directions.north;
  }
}

function addDoorToRoom(room: Room, direction: Directions): void {
  room.doors[direction] = true;
}

function calculateRoomPosition(
  fromRoom: Room,
  direction: Directions,
  newRoomSize: number,
  corridorLength: number
): Position {
  const [x, y, z] = fromRoom.position;
  const fromSize = fromRoom.size;
  const corridorSpace = corridorLength * fullTile;

  switch (direction) {
    case Directions.north:
      return [
        x + ((fromSize - newRoomSize) * fullTile) / 2,
        y,
        z + fromSize * fullTile + corridorSpace,
      ];

    case Directions.south:
      return [
        x + ((fromSize - newRoomSize) * fullTile) / 2,
        y,
        z - newRoomSize * fullTile - corridorSpace,
      ];

    case Directions.east:
      return [
        x + fromSize * fullTile + corridorSpace,
        y,
        z + ((fromSize - newRoomSize) * fullTile) / 2,
      ];

    case Directions.west:
      return [
        x - newRoomSize * fullTile - corridorSpace,
        y,
        z + ((fromSize - newRoomSize) * fullTile) / 2,
      ];

    default:
      return [x, y, z];
  }
}

function calculateCorridor(
  fromRoom: Room,
  toRoom: Room,
  direction: Directions
): {
  position: Position;
  length: number;
  width: number;
  orientation: "x" | "z";
} {
  const corridorWidth = 3;
  const [fromX, fromY, fromZ] = fromRoom.position;
  const [toX, toY, toZ] = toRoom.position;
  const fromSize = fromRoom.size;
  const toSize = toRoom.size;

  switch (direction) {
    case Directions.north:
      return {
        position: [
          fromX + (fromSize * fullTile - corridorWidth * fullTile) / 2,
          fromY,
          fromZ + fromSize * fullTile,
        ],
        length: (toZ - fromZ - fromSize * fullTile) / fullTile,
        width: corridorWidth,
        orientation: "z",
      };

    case Directions.south:
      return {
        position: [
          fromX + (fromSize * fullTile - corridorWidth * fullTile) / 2,
          fromY,
          toZ + toSize * fullTile,
        ],
        length: (fromZ - toZ - toSize * fullTile) / fullTile,
        width: corridorWidth,
        orientation: "z",
      };

    case Directions.east:
      return {
        position: [
          fromX + fromSize * fullTile,
          fromY,
          fromZ + (fromSize * fullTile - corridorWidth * fullTile) / 2,
        ],
        length: (toX - fromX - fromSize * fullTile) / fullTile,
        width: corridorWidth,
        orientation: "x",
      };

    case Directions.west:
      return {
        position: [
          toX + toSize * fullTile,
          fromY,
          fromZ + (fromSize * fullTile - corridorWidth * fullTile) / 2,
        ],
        length: (fromX - toX - toSize * fullTile) / fullTile,
        width: corridorWidth,
        orientation: "x",
      };

    default:
      return {
        position: [0, 0, 0],
        length: 0,
        width: 0,
        orientation: "x",
      };
  }
}

export function generateDungeon(
  config: DungeonConfig = defaultConfig
): Component[] {
  const allComponents: Component[] = [];
  const rooms: Room[] = [];

  const numRooms = getRandomIntUneven(config.minRooms, config.maxRooms);

  const startRoomType = getRandomRoomType(config);
  const startRoomSize = getRoomSize(startRoomType);
  const startRoom: Room = {
    id: 0,
    type: startRoomType,
    size: startRoomSize,
    position: [0, 0, 0],
    connections: [],
    doors: {
      north: false,
      east: false,
      south: false,
      west: false,
    },
  };

  rooms.push(startRoom);

  let attempts = 0;
  const maxAttempts = numRooms * 10;

  while (rooms.length < numRooms && attempts < maxAttempts) {
    attempts++;

    const fromRoom = getRandomItem(rooms);

    const possibleDirections = [
      Directions.north,
      Directions.east,
      Directions.south,
      Directions.west,
    ];

    const direction = getRandomItem(possibleDirections);

    const newRoomType = getRandomRoomType(config);
    const newRoomSize = getRoomSize(newRoomType);
    const corridorLength = getRandomIntUneven(
      config.corridorLengthRange[0],
      config.corridorLengthRange[1]
    );
    const corridorWidth = getRandomIntUneven(
      config.corridorWidthRange[0],
      config.corridorWidthRange[1]
    );

    const newRoomPosition = calculateRoomPosition(
      fromRoom,
      direction,
      newRoomSize,
      corridorLength
    );

    if (isPositionAvailable(newRoomPosition, newRoomSize, rooms)) {
      const newRoom: Room = {
        id: rooms.length,
        type: newRoomType,
        size: newRoomSize,
        position: newRoomPosition,
        connections: [],
        doors: {
          north: false,
          east: false,
          south: false,
          west: false,
        },
      };

      const connection: Connection = {
        fromRoom: fromRoom.id,
        toRoom: newRoom.id,
        direction: direction,
        corridorLength: corridorLength,
        corridorWidth: corridorWidth,
      };

      fromRoom.connections.push(connection);

      newRoom.connections.push({
        fromRoom: newRoom.id,
        toRoom: fromRoom.id,
        direction: getOppositeDirection(direction),
      });

      addDoorToRoom(fromRoom, direction);
      addDoorToRoom(newRoom, getOppositeDirection(direction));

      rooms.push(newRoom);
    }
  }

  const maxExtraConnections = Math.floor(
    rooms.length * (config.complexity / 100)
  );
  let extraConnections = 0;

  attempts = 0;
  const maxConnectionAttempts = maxExtraConnections * 5;

  while (
    extraConnections < maxExtraConnections &&
    attempts < maxConnectionAttempts
  ) {
    attempts++;

    const roomA = getRandomItem(rooms);
    const roomB = getRandomItem(rooms);

    if (roomA.id === roomB.id) continue;

    if (roomA.connections.some((conn) => conn.toRoom === roomB.id)) continue;

    const [ax, ay, az] = roomA.position;
    const [bx, by, bz] = roomB.position;

    let direction: Directions;

    if (Math.abs(bx - ax) > Math.abs(bz - az)) {
      direction = bx > ax ? Directions.east : Directions.west;
    } else {
      direction = bz > az ? Directions.north : Directions.south;
    }

    if (
      roomA.doors[direction] ||
      roomB.doors[getOppositeDirection(direction)]
    ) {
      continue;
    }

    const corridorWidth = getRandomIntUneven(
      config.corridorWidthRange[0],
      config.corridorWidthRange[1]
    );

    const corridor = calculateCorridor(roomA, roomB, direction);

    if (corridor.length > 0 && corridor.length < 20) {
      const connection: Connection = {
        fromRoom: roomA.id,
        toRoom: roomB.id,
        direction: direction,
        corridorWidth: corridorWidth,
        corridorLength: corridor.length,
      };

      roomA.connections.push(connection);

      roomB.connections.push({
        fromRoom: roomB.id,
        toRoom: roomA.id,
        direction: getOppositeDirection(direction),
      });

      addDoorToRoom(roomA, direction);
      addDoorToRoom(roomB, getOppositeDirection(direction));

      extraConnections++;
    }
  }

  for (const room of rooms) {
    const roomComponents = calculateRoomSquare(
      room.size,
      room.doors,
      room.position,
      config.torches,
      config.torchInterval
    );
    allComponents.push(...roomComponents);

    for (const connection of room.connections) {
      if (connection.fromRoom < connection.toRoom) {
        const toRoom = rooms.find((r) => r.id === connection.toRoom)!;

        if (connection.corridorLength && connection.corridorWidth) {
          const corridor = calculateCorridor(
            room,
            toRoom,
            connection.direction
          );

          if (corridor.orientation === "x") {
            const hallComponents = calculateHallwayX(
              corridor.length,
              corridor.position,
              config.torches,
              config.torchInterval
            );
            allComponents.push(...hallComponents);
          } else {
            const hallComponents = calculateHallwayZ(
              corridor.length,
              corridor.position,
              config.torches,
              config.torchInterval
            );
            allComponents.push(...hallComponents);
          }
        }
      }
    }
  }

  return allComponents;
}

export function generateCustomDungeon(
  customConfig?: Partial<DungeonConfig>
): Component[] {
  const config = { ...defaultConfig, ...customConfig };
  return generateDungeon(config);
}
