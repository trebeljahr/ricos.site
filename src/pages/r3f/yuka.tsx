import { MinecraftCreativeController } from "@components/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "@components/canvas/Controllers/KeyboardControls";
import { YukaSimulation } from "@components/canvas/Yuka/YukaExample";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ThreeFiberLayout } from "@components/dom/Layout";

const Page = () => {
  return (
    <ThreeFiberLayout>
      <KeyboardControlsProvider>
        <Canvas>
          <Physics>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            <MinecraftCreativeController speed={25} />
            <YukaSimulation />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
