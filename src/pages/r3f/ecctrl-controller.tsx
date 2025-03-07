import { EcctrlController } from "src/canvas/Controllers/EcctrlController";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import Grass from "src/canvas/Grass";
import { Lights } from "src/canvas/Helpers/Lights";
import { Obstacles } from "src/canvas/Scenes/Obstacles";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <Physics debug timeStep="vary">
          <Lights />
          <Sky />

          <EcctrlController />
          <Obstacles />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
