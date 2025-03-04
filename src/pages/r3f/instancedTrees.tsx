import { MinecraftCreativeController } from "@components/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "@components/canvas/Controllers/KeyboardControls";
import { TreeTile } from "@components/canvas/Trees/TreeTile";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

const gridHelperSize = 100;

const Page = () => {
  return (
    <div className="h-screen w-screen">
      <KeyboardControlsProvider>
        <Canvas>
          <Physics>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            <MinecraftCreativeController speed={25} />
            {/* <InstancedTreeSystem /> */}
            <gridHelper args={[gridHelperSize, 100]} />
            <TreeTile />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
