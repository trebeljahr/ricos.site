import { CanvasWithControls } from "@components/canvas/Scene";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls, Stage } from "@react-three/drei";

import dynamic from "next/dynamic";

const DynamicCharacter = dynamic(() => import("../../components/Character"), {
  ssr: false,
});

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithControls>
        <Stage
          adjustCamera
          intensity={0.5}
          shadows="contact"
          environment="city"
        >
          <DynamicCharacter />
        </Stage>
        <OrbitControls />
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}
