import { FBOParticles } from "@r3f/Scenes/FBOExperiments/Particles/Particles";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { OrbitControls } from "@react-three/drei";

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <FBOParticles />
        <OrbitControls />
        <color attach="background" args={["#393c4a"]} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
