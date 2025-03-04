import { MinecraftCreativeControlsPlayer } from "@components/canvas/Controllers/FlyingPlayer";
import { OceanSurface } from "@components/canvas/OceanDemo/Ocean";
import { CanvasWithControls } from "@components/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { PointerLockControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";

const Ship = dynamic(() => import("@models/Ship"), { ssr: false });

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithControls>
        <Sky azimuth={1} inclination={0.6} distance={1000} />
        <Physics>
          <MinecraftCreativeControlsPlayer />
        </Physics>
        <PointerLockControls />
        <Ship />
        <OceanSurface />
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ship Demo" } };
}
