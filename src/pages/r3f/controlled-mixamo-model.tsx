import { EcctrlController } from "@components/canvas/Controllers/EcctrlController";
import { CanvasWithControls } from "@components/canvas/Controllers/KeyboardControls";
import Grass from "@components/canvas/Grass";
import { Lights } from "@components/canvas/Helpers/Lights";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithControls>
        <Physics debug timeStep="vary">
          <Lights />
          <Sky />

          <EcctrlController />

          <Grass size={0.3} />
        </Physics>
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}
