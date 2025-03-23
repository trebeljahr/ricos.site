import { perf } from "src/canvas/ChunkGenerationSystem/config";
import { Birds } from "@r3f/Scenes/FBOExperiments/Birds";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Vector3 } from "three";

export default function Page() {
  const skyColor = "#FFFFFF";
  return (
    <ThreeFiberLayout>
      <Canvas camera={{ position: new Vector3(0, 0, 350), near: 1, far: 3000 }}>
        <Birds />
        <color attach="background" args={[skyColor]} />
        <fog color={skyColor} near={100} far={1000} />
        {perf && <Perf position="bottom-right" />}
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
