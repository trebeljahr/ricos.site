import { EcctrlController } from "@components/canvas/Controllers/EcctrlController";
import { CanvasWithKeyboardInput } from "@components/canvas/Controllers/KeyboardControls";
import Grass from "@components/canvas/Grass";
import { Lights } from "@components/canvas/Helpers/Lights";
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

          <Grass size={0.3} />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
