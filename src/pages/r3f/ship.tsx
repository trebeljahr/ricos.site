import { MinecraftCreativeController } from "@components/canvas/Controllers/MinecraftCreativeController";
import { OceanSurface } from "@components/canvas/OceanDemo/Ocean";
import { CanvasWithKeyboardInput } from "@components/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { PointerLockControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";

const Ship = dynamic(() => import("@models/Ship"), { ssr: false });

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <Sky azimuth={1} inclination={0.6} distance={1000} />
        <Physics>
          <MinecraftCreativeController />
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
