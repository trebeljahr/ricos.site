import { Fishs } from "@r3f/Scenes/Particles/Fishes/Scene";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";

const seoInfo = {
  title: "A FBO particles demo using custom meshes of Fish",
  description:
    "I was trying to simulate a school of fish using FBO particles in R3F and this is one of the first results. The fish are custom meshes and their positions are updated using a compute shader.",
  url: "/r3f/particles/fishes",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/fishes.png",
  imageAlt: "a school of fish swimming around in a 3D scene",
};

export default function Page() {
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      withKeyboardControls={false}
      camera={{ position: new Vector3(0, 0, 2), near: 0 }}
    >
      <Fishs />

      <ambientLight />
      <directionalLight />
      <fog color={0xffffff} near={100} far={1000} />

      <OrbitControls />
    </ThreeFiberLayout>
  );
}
