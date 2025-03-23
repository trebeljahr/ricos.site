import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import dynamic from "next/dynamic";

const DynamicCharacter = dynamic(() => import("@r3f/Characters/Character"), {
  ssr: false,
});

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas camera={{ position: [0, 1, 2] }}>
        <color attach="background" args={["skyblue"]} />
        <Stage adjustCamera={false}>
          <DynamicCharacter />
        </Stage>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
