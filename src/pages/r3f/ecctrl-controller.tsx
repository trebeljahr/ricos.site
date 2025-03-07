import { EcctrlController } from "@components/canvas/Controllers/EcctrlController";
import { CanvasWithKeyboardInput } from "@components/canvas/Controllers/KeyboardControls";
import Grass from "@components/canvas/Grass";
import { Lights } from "@components/canvas/Helpers/Lights";
import { Obstacles } from "@components/canvas/Scenes/Obstacles";
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
