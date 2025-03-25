import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
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
      <CanvasWithKeyboardInput>
        <Sky azimuth={1} inclination={0.6} distance={1000} />
        <Physics>
          <MinecraftSpectatorController speed={1} />
        </Physics>
        <Ship />
        <OceanSurface />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ship Demo" } };
}
