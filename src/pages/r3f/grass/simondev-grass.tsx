import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { SimondevGrass } from "@r3f/Scenes/Grass/SimondevGrass/SimondevGrass";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Vector3 } from "three";

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/grass/simondev-grass",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/simondev-grass.png",
  imageAlt: "a 3D view of a grassy plane",
};

export default function Page() {
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      camera={{ position: new Vector3(26, 18, 22) }}
    >
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Physics>
        <SimondevGrass />
        <MinecraftSpectatorController speed={1} />
      </Physics>
    </ThreeFiberLayout>
  );
}
