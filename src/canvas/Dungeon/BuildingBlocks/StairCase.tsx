import {
  Column2,
  Fence_90_Modular,
  Fence_End_Modular,
  Fence_Straight_Modular,
  Floor_Modular,
  Stairs_Modular,
  Stairs_SideCover,
  Stairs_SideCoverWall,
  Wall_Modular,
  WallCover_Modular,
} from "@r3f/AllModels/modular_dungeon_pack_1";
import { GroupProps } from "@react-three/fiber";

export const StairCase = (props: GroupProps) => {
  return (
    <group {...props}>
      <Stairs_Modular position={[0, 0, 0]} />
      <Stairs_Modular position={[-2, 0, 0]} />
      <Stairs_SideCover position={[0, 0, 0]} />
      <Stairs_SideCover position={[-4, 0, 0]} />
      <Stairs_Modular position={[0, 2, -2]} />
      <Stairs_Modular position={[-2, 2, -2]} />
      <Stairs_SideCover position={[0, 2, -2]} />
      <Stairs_SideCover position={[-4, 2, -2]} />

      <Wall_Modular position={[1, 0, -6]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 0, -6]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[1, 2, -6]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 2, -6]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[1, 4, -6]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[-3, 4, -6]} rotation-y={Math.PI / 2} />

      <Wall_Modular position={[1, 0, -4]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 0, -4]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[1, 2, -4]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 2, -4]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[1, 4, -4]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[-3, 4, -4]} rotation-y={Math.PI / 2} />

      <Wall_Modular position={[0, 0, -7]} />
      <Wall_Modular position={[-2, 0, -7]} />
      <Wall_Modular position={[0, 2, -7]} />
      <Wall_Modular position={[-2, 2, -7]} />
      <WallCover_Modular position={[0, 4, -7]} />
      <WallCover_Modular position={[-2, 4, -7]} />

      {/* <Stairs_SideCoverWall position={[0, 0, -2]} /> */}
      {/* <Stairs_SideCoverWall position={[-4, 0, -2]} /> */}

      <Stairs_SideCoverWall position={[0, 0, 0]} />
      <Stairs_SideCoverWall position={[-4, 0, 0]} />

      <Floor_Modular position={[0, 3, -4]} />
      <Floor_Modular position={[-2, 3, -4]} />
      <Floor_Modular position={[0, 3, -6]} />
      <Floor_Modular position={[-2, 3, -6]} />

      <Column2 position={[-3, -1, -3]} />
      <Column2 position={[1, -1, -3]} />
      <Column2 position={[-3, -1, -7]} />
      <Column2 position={[1, -1, -7]} />

      <Fence_End_Modular position={[-3, 4, -3]} rotation-y={Math.PI / 2} />
      <Fence_End_Modular position={[1, 4, -3]} rotation-y={Math.PI / 2} />

      <Fence_Straight_Modular position={[-3, 4, -5]} rotation-y={Math.PI / 2} />
      <Fence_Straight_Modular position={[1, 4, -5]} rotation-y={Math.PI / 2} />

      <Fence_Straight_Modular position={[-1, 4, -7]} />

      <Fence_90_Modular position={[-3, 4, -7]} rotation-y={-Math.PI / 2} />
      <Fence_90_Modular
        position={[1, 4, -7]}
        rotation-y={-Math.PI} /// 2 - Math.PI}
      />
    </group>
  );
};
