import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { ImprovedPlayerController } from "../Controllers/PlayerController";
import { Floor } from "../OceanDemo/Terrain";
import { InstancedTreesWithPhysics } from "../Trees/TreeStuff";

export default function ThirdPersonDemo() {
  return (
    <>
      <Sky azimuth={1} inclination={0.6} distance={1000} />

      <Physics debug colliders="hull">
        <ImprovedPlayerController />
        <Floor />
        <InstancedTreesWithPhysics />
      </Physics>
    </>
  );
}
