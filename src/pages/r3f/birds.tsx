import { Birds } from "@components/canvas/Birds";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Vector3 } from "three";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas camera={{ position: new Vector3(0, 0, 350), near: 1, far: 3000 }}>
        <Birds />
        <fog color={0xffffff} near={100} far={1000} />
        <Perf />
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
