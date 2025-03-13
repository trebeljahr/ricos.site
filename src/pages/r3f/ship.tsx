import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { OceanSurface } from "src/canvas/OceanDemo/Ocean";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { PointerLockControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";

const Ship = dynamic(() => import("src/canvas/models/Ship"), {
  ssr: false,
});

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <Sky azimuth={1} inclination={0.6} distance={1000} />
        <Physics>
          <MinecraftSpectatorController />
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
