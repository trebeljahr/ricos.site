import { FirstPersonController } from "@components/canvas/Controllers/FirstPersonController";
import { CanvasWithKeyboardInput } from "@components/canvas/Controllers/KeyboardControls";
import { Obstacles } from "@components/canvas/Scenes/Obstacles";
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
