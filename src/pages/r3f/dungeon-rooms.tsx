import { ThreeFiberLayout } from "@components/dom/Layout";
import { Cat } from "src/canvas/models/Cat";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#ffcc32"]} />

        <Stage>
          <Cat />
        </Stage>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
