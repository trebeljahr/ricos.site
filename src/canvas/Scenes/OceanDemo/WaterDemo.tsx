import { useUnderwaterContext, waterHeight } from "@contexts/UnderwaterContext";
import Whale from "@r3f/AllModels/fish_pack/Whale";
import { Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { useEffect, useRef } from "react";
import { Color, FogExp2, Group, Vector3 } from "three";
import { Sky as SkyImpl } from "three-stdlib";
import { SwimmingController } from "../../Controllers/SwimmingController";
import { FishType, Fishes } from "../Particles/Fishes/Scene";
import { OceanSurface } from "./Ocean";
import { UI } from "./OxygenBar";
import { Terrain } from "./OceanFloor";

function MovingInCircle() {
  const whaleRef = useRef<Group>(null!);

  useFrame(() => {
    if (!whaleRef.current) return;

    whaleRef.current.position.z += 0.05;
    whaleRef.current.rotation.y += 0.01;
  });

  return (
    <group ref={whaleRef}>
      <Whale scale={3} position={new Vector3(-10, 30, 5)} />
    </group>
  );
}

export default function WaterDemo() {
  const { scene } = useThree();
  const fogRef = useRef<FogExp2>(null!);
  const colorRef = useRef<Color>(null!);
  const skyRef = useRef<SkyImpl>(null!);
  const { underwater } = useUnderwaterContext();

  useEffect(() => {
    if (!underwater) {
      fogRef.current.density = 0.000000001;
      fogRef.current.density = 0.000000001;
      fogRef.current.color = new Color("white");
      scene.background = new Color("white");
    } else {
      fogRef.current.density = 0.02;
      fogRef.current.density = 0.02;
      fogRef.current.color = new Color("#0086ad");
      scene.background = new Color("#0086ad");
      colorRef.current.set("#0086ad");
    }
  }, [underwater, scene]);

  return (
    <>
      <UI />
      <Physics>
        <SwimmingController />
      </Physics>
      <ambientLight />
      <directionalLight position={[0, 10, 0]} intensity={1} />

      <fogExp2 ref={fogRef} attach="fog" color="#0086ad" density={0.02} />
      <color ref={colorRef} attach="background" args={["#0086ad"]} />
      <OceanSurface position={[0, waterHeight, 0]} />
      <Terrain />

      <Fishes position={new Vector3(-5, 10, 0)} />
      <Fishes
        position={new Vector3(10, 10, 0)}
        fishType={FishType.BlueTang}
        color="#7fe08f"
      />
      <Fishes
        position={new Vector3(5, 10, 5)}
        fishType={FishType.Manta}
        color="#394e4d"
      />
      <Fishes
        position={new Vector3(0, 10, 10)}
        fishType={FishType.DoctorFish}
        color="#1ea8ed"
      />

      <MovingInCircle />

      {!underwater && (
        <Sky ref={skyRef} azimuth={1} inclination={0.6} distance={2000} />
      )}
    </>
  );
}
