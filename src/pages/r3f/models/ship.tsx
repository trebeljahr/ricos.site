import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { OceanSurface } from "src/canvas/Scenes/OceanDemo/Ocean";

const Ship = dynamic(() => import("@r3f/AllModels/Ship"), {
  ssr: false,
});

const seoInfo = {
  title: "Ship Demo",
  description:
    "A simple ship model swimming in the default Drei ocean shader. One of my first demos built with R3F and three.js",
  url: "/r3f/models/Ship",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/ship.png",
  imageAlt: "a 3D model of a ship floating in the ocean",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState
        camera={{
          position: [19, 12, 27],
          rotation: [
            -0.1819164443624924, 0.7349237008688785, 0.12272431719745204,
          ],
        }}
      >
        <Sky />
        <Physics>
          <MinecraftSpectatorController speed={1} />
        </Physics>
        <Ship />
        <OceanSurface />
        <CameraPositionLogger />
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ship Demo" } };
}
