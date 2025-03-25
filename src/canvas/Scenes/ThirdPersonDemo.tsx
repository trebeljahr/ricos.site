import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { ThirdPersonController } from "../Controllers/ThirdPersonController";
import { Floor } from "../Scenes/OceanDemo/OceanFloor";
import { InstancedTreesWithPhysics } from "../Trees/TreesWithPhysics";
import { Trex } from "@r3f/AllModels/Trex";

export default function ThirdPersonDemo() {
  return (
    <>
      <Sky azimuth={1} inclination={0.6} distance={1000} />

      <Physics colliders="hull">
        <ThirdPersonController Model={Trex} />
        <Floor />
        <InstancedTreesWithPhysics />
      </Physics>
    </>
  );
}
