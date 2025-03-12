import { ThreeFiberLayout } from "@components/dom/Layout";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { DungeonFromLayout } from "@r3f/Scenes/DungeonRoomsWithInstancing";
import { Stage } from "@react-three/drei";
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
          <DungeonFromLayout />
        </Stage>
        <Physics>
          <MinecraftCreativeController initialPosition={[0, 10, 0]} />
        </Physics>
        {/* <OrbitControls /> */}
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
