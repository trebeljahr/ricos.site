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
