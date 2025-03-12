import { ThreeFiberLayout } from "@components/dom/Layout";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import {
  Arch,
  Arch_Door,
  Floor_Modular,
  Wall_Modular,
} from "@r3f/models/modular_dungeon_pack_1";
import { DungeonRooom } from "@r3f/Scenes/DungeonRooms";
import {
  CustomDungeon,
  DungeonFromLayout,
} from "@r3f/Scenes/DungeonRoomsWithInstancing";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas, GroupProps } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        {/* <ambientLight intensity={2} /> */}
        <color attach="background" args={["#fbf1d1"]} />
        {perf && <Perf position="bottom-right" />}
        <Stage>
          <CustomDungeon />
        </Stage>
        <Physics>
          <MinecraftCreativeController />
        </Physics>
        {/* <OrbitControls /> */}
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
