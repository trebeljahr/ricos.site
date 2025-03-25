import { EcctrlController } from "src/canvas/Controllers/EcctrlController";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import Grass from "@r3f/Scenes/Grass";
import { Lights } from "src/canvas/Helpers/Lights";
import { Obstacles, TreeObstacles } from "@r3f/Helpers/Obstacles";
import { ThreeFiberLayout } from "@components/dom/Layout";
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
        <Physics debug timeStep="vary">
          <Lights />
          <Sky />
          <EcctrlController position={[0, 10, 5]} />
          <Obstacles />
          <TreeObstacles />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
