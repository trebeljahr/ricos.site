import { FirstPersonController } from "src/canvas/Controllers/FirstPersonController";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { Obstacles } from "src/canvas/Scenes/Obstacles";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <Sky azimuth={1} inclination={0.6} distance={1000} />

        <Physics debug colliders="hull">
          <FirstPersonController />
          <Obstacles />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
