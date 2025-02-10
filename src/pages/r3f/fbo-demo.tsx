import { FBOParticles } from "@components/canvas/FBOExperiments/Particles";
import { CanvasWithControls } from "@components/canvas/Scene";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls } from "@react-three/drei";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithControls>
        <FBOParticles />
        <OrbitControls />
        <color attach="background" args={["#20222B"]} />
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}
