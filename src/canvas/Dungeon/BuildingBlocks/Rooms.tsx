import {
  Wall_Modular,
  WallCover_Modular,
} from "@r3f/AllModels/modular_dungeon_pack_1";
import { GroupProps } from "@react-three/fiber";

export const DungeonBox = ({
  depth,
  width,
  ...props
}: GroupProps & { depth: number; width: number }) => {
  return (
    <group {...props}>
      <Wall length={width} position={[1, 1, 1]} />
      <Wall length={depth} position={[0, 1, 0]} rotation-y={Math.PI / 2} />
      <Wall
        length={depth}
        position={[width * 2, 1, 0]}
        rotation-y={Math.PI / 2}
      />
      <Wall length={width} position={[1, 1, -depth * 2 + 1]} />
    </group>
  );
};

export const Wall = ({ length, ...props }: GroupProps & { length: number }) => {
  const positions = Array.from({ length }, (_, i) => i);
  return (
    <group {...props}>
      {positions.map((i) => (
        <group key={i}>
          <WallCover_Modular position={[i * 2, 0, 0]} />
          <Wall_Modular position={[i * 2, 0, 0]} />
          <Wall_Modular position={[i * 2, 2, 0]} />
          <WallCover_Modular position={[i * 2, 4, 0]} />
        </group>
      ))}

      {/* <Wall_Modular position={[0, 0, 0]} />
      <Wall_Modular position={[0, 2, 0]} />
      <Wall_Modular position={[0, 4, 0]} /> */}
    </group>
  );
};
