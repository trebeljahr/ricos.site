import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { AllRoGrass } from "@r3f/Scenes/Grass/AllRoGrass/GrassPlane";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Vector3 } from "three";

const seoInfo = {
  title: "A single square grass plane",
  description:
    "In this scene, I'm testing out a single square grass plane in React Three Fiber based on a codepen from al-ro.",
  url: "/r3f/grass/al-ro-grass",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/al-ro-grass.png",
  imageAlt: "a 3D view of a grassy plane",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState camera={{ position: new Vector3(0, 3, 0) }}>
        <Sky />
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Physics>
          <AllRoGrass />
          <MinecraftSpectatorController speed={1} />
        </Physics>
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}
