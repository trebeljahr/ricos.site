import { FBOParticles } from "@components/canvas/FBOExperiments/Particles";
import { CanvasWithKeyboardInput } from "@components/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls } from "@react-three/drei";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <FBOParticles />
        <OrbitControls />
        <color attach="background" args={["#20222B"]} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
