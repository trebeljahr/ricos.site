import { FBOParticles } from "@r3f/Scenes/FBOExperiments/Particles/Particles";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls } from "@react-three/drei";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <FBOParticles />
        <OrbitControls />
        <color attach="background" args={["#393c4a"]} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
