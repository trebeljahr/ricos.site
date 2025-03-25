import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import dynamic from "next/dynamic";

const DynamicCharacter = dynamic(() => import("@r3f/Characters/Character"), {
  ssr: false,
});

const seoInfo = {
  title: "Mixamo Character Demos",
  description:
    "Showcasing different Mixamo Characters in a 3D scene with animations",
  url: "/r3f/mixamo-characters",
  keywords: [
    "threejs",
    "react-three-fiber",

    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/mixamo-characters.png",
  imageAlt: "Mixamo character dancing in a 3D scene",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
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
