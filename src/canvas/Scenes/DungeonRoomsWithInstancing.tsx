import {
  Arch,
  Floor_Modular,
  Wall_Modular,
} from "@r3f/models/modular_dungeon_pack_1";
import { GroupProps } from "@react-three/fiber";
import {
  calculateDungeonLayout,
  calculateHallway,
  calculateRoomSquare,
  createSingleDoor,
  Directions,
} from "./DungeonRoomsLayoutCalculator";

// Render a complete dungeon based on calculated layout data
export const DungeonFromLayout = (props: GroupProps) => {
  const components = calculateDungeonLayout();

  return (
    <group {...props}>
      {components.map((component, index) => {
        const { type, position, rotation = [0, 0, 0] } = component;

        // Convert arrays to objects with x, y, z properties for R3F
        const positionObj = {
          x: position[0],
          y: position[1],
          z: position[2],
        };

        const rotationObj = {
          x: rotation[0],
          y: rotation[1],
          z: rotation[2],
        };

        switch (type) {
          case "floor":
            return (
              <Floor_Modular
                key={`floor-${index}`}
                position={[position[0], position[1], position[2]]}
                rotation={[rotation[0], rotation[1], rotation[2]]}
              />
            );

          case "wall":
            return (
              <Wall_Modular
                key={`wall-${index}`}
                position={[position[0], position[1], position[2]]}
                rotation={[rotation[0], rotation[1], rotation[2]]}
              />
            );

          case "arch":
            return (
              <Arch
                key={`arch-${index}`}
                position={[position[0], position[1], position[2]]}
                rotation={[rotation[0], rotation[1], rotation[2]]}
                scale-x={0.8}
              />
            );

          default:
            return null;
        }
      })}
    </group>
  );
};

// Example of building a custom dungeon layout programmatically
export const CustomDungeon = (props: GroupProps) => {
  // Calculate your custom layout
  const components = [
    // Main chamber
    ...calculateRoomSquare(7, createSingleDoor(Directions.north), [0, 0, 0]),

    // Small side room
    ...calculateRoomSquare(4, createSingleDoor(Directions.south), [5, 0, -10]),

    // Connecting hallway
    ...calculateHallway(3, 2, [3, 0, -4]),
  ];

  // Render the components
  return (
    <group {...props}>
      {components.map((component, index) => {
        const { type, position, rotation = [0, 0, 0] } = component;

        switch (type) {
          case "floor":
            return (
              <Floor_Modular
                key={`floor-${index}`}
                position={position}
                rotation={rotation}
              />
            );

          case "wall":
            return (
              <Wall_Modular
                key={`wall-${index}`}
                position={position}
                rotation={rotation}
              />
            );

          case "arch":
            return (
              <Arch
                key={`arch-${index}`}
                position={position}
                rotation={rotation}
                scale-x={0.8}
              />
            );

          default:
            return null;
        }
      })}
    </group>
  );
};
