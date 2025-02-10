import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { OceanSurface } from "@components/canvas/Ocean";
import Scene from "@components/canvas/Scene";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { PointerLockControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";

const Ship = dynamic(() => import("@components/canvas/Ship"), { ssr: false });

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Scene>
        <Sky azimuth={1} inclination={0.6} distance={1000} />
        <Physics>
          <MinecraftCreativeControlsPlayer />
        </Physics>
        <PointerLockControls />
        <Ship />
        <OceanSurface />
      </Scene>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ship Demo" } };
}
