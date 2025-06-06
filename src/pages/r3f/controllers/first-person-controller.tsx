import { FirstPersonController } from "src/canvas/Controllers/FirstPersonController";

import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Obstacles } from "@r3f/Helpers/Obstacles";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

const seoInfo = {
  title: "First Person Controller",
  description:
    "An implementation of a first person controller in React Three Fiber, using the rapier physics engine.",
  url: "/r3f/controllers/first-person-controller",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/r3f/first-person-controller.png",
  imageAlt: "a first person view of a 3D scene with joystick controls",
};

export default function Page() {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <Sky azimuth={1} inclination={0.6} distance={1000} />
      <ambientLight />
      <Physics colliders="hull">
        <FirstPersonController />
        <Obstacles />
      </Physics>
    </ThreeFiberLayout>
  );
}
