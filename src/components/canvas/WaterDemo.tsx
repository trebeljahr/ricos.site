import { useUnderwaterContext, waterHeight } from "@contexts/UnderwaterContext";
import Whale from "@models/fish_pack/Whale";
import { Environment, Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { useEffect, useRef } from "react";
import { Color, FogExp2, Group, Vector3 } from "three";
import { Sky as SkyImpl } from "three-stdlib";
import { FishType, Fishs } from "./Fish";
import { SwimmingPlayerControls } from "./FlyingPlayer";
import { OceanSurface } from "./Ocean";
import { Terrain } from "./Terrain";
import { UI } from "./UI";

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
// color palette underwater
// #daf8e3
// #97ebdb
// #00c2c7
// #0086ad
// #005582

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
      {/* <Environment preset='forest' /> */}
      <UI />
      <Physics>
        <SwimmingPlayerControls />
      </Physics>
      <Perf />

      <fogExp2 ref={fogRef} attach="fog" color="#0086ad" density={0.02} />
      <color ref={colorRef} attach="background" args={["#0086ad"]} />
      <OceanSurface position={[0, waterHeight, 0]} />
      <Terrain />

      <Fishs position={new Vector3(-5, 10, 0)} />
      <Fishs
        position={new Vector3(10, 10, 0)}
        fishType={FishType.BlueTang}
        color="#7fe08f"
      />
      <Fishs
        position={new Vector3(5, 10, 5)}
        fishType={FishType.Manta}
        color="#394e4d"
      />
      <Fishs
        position={new Vector3(0, 10, 10)}
        fishType={FishType.DoctorFish}
        color="#1ea8ed"
      />
      {/* <Fishs position={new Vector3(20, 10, 5)} fishType={FishType.Whale} color='#0b4171' scaleFactor={3} /> */}
      <Fishs
        position={new Vector3(15, 10, 10)}
        fishType={FishType.Whale}
        color="#6b6b6b"
        amount={10}
        scaleFactor={2}
      />
      <Fishs
        position={new Vector3(10, 5, 0)}
        fishType={FishType.Dolphin}
        color="#617675"
      />

      <MovingInCircle />

      {!underwater && (
        <Sky ref={skyRef} azimuth={1} inclination={0.6} distance={2000} />
      )}
    </>
  );
}
