import {
  Arch,
  Floor_Modular,
  Wall_Modular,
} from "@r3f/models/modular_dungeon_pack_1";
import { GroupProps } from "@react-three/fiber";
import { calculateDungeonLayout } from "./DungeonRoomsLayoutCalculator";

export const DungeonFromLayout = (props: GroupProps) => {
  const components = calculateDungeonLayout();

  return (
    <group {...props}>
      {components.map((component, index) => {
        const { type, position, rotation = [0, 0, 0] } = component;

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
