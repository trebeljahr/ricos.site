import { ThreeFiberLayout } from "@components/dom/Layout";
import { PlasmaBall } from "@r3f/Scenes/PlasmaBall";
import { Environment, OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#121524"]} />
        <ambientLight intensity={1} />

        <Stage adjustCamera>
          <PlasmaBall />
        </Stage>

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls autoRotate />
      </Canvas>
    </ThreeFiberLayout>
  );
}
