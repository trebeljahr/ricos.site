import { Fishs } from "@r3f/Scenes/FBOExperiments/Fish";
import { SceneWithLoadingState } from "src/canvas/Helpers/SceneLoader";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Box } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Vector3 } from "three";
import { perf } from "src/canvas/ChunkGenerationSystem/config";

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
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState
        camera={{ position: new Vector3(0, 0, 2), near: 1, far: 3000 }}
      >
        <Fishs />

        <ambientLight />
        <fog color={0xffffff} near={100} far={1000} />
        {perf && <Perf position="bottom-right" />}
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}
