import { FirstPersonController } from "src/canvas/Controllers/FirstPersonController";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { Obstacles } from "@r3f/Helpers/Obstacles";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

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
        <Sky azimuth={1} inclination={0.6} distance={1000} />

        <Physics debug colliders="hull">
          <FirstPersonController />
          <Obstacles />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
