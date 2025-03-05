import { CanvasWithKeyboardInput } from "@components/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls, Stage } from "@react-three/drei";

import dynamic from "next/dynamic";

const DynamicCharacter = dynamic(() => import("@components/Character"), {
  ssr: false,
});

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["skyblue"]} />
        <Stage adjustCamera={true}>
          <DynamicCharacter />
        </Stage>
        <OrbitControls />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
