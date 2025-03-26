import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Obstacles, TreeObstacles } from "@r3f/Helpers/Obstacles";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { EcctrlController } from "src/canvas/Controllers/EcctrlController";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { Lights } from "src/canvas/Helpers/Lights";

const seoInfo = {
  title: "R3F Ecctrl Controller",
  description:
    "Implementation of the Ecctrl Controller in React Three Fiber. This is a simple 3D demo scene with a mixamo model that can move around the scene with animations.",
  url: "/r3f/controllers/ecctrl-controller",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/r3f/ecctrl-controller.png",
  imageAlt: "an image of a girl standing in front of some trees",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState>
        <Physics debug timeStep="vary">
          <Lights />
          <Sky />
          <EcctrlController position={[0, 10, 5]} />
          <Obstacles />
          <TreeObstacles />
        </Physics>
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}
