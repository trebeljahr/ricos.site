import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { StatefulParticleDemo } from "@r3f/Scenes/Particles/StatefulParticleDemo/StatefulParticleDemo";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";

const seoInfo = {
  title: "Stateful SimonDev Particle Example",
  description: "",
  url: "/r3f/particles/simondev-stateful",
  keywords: [
    "threejs",
    "react-three-fiber",
    "particles",
    "FBO",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/simondev-stateful.png",
  imageAlt: "",
};

export default function Page() {
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      withKeyboardControls={false}
      camera={{ position: new Vector3(0, 0, 2) }}
    >
      <ambientLight intensity={2} />
      <color attach="background" args={["#191616"]} />
      <StatefulParticleDemo />
      <OrbitControls />
    </ThreeFiberLayout>
  );
}
