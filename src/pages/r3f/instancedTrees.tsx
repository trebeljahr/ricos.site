import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { generateTreePositions } from "@components/canvas/Yuka/YukaExample";
import { InstancedBirchTreeSnow5 } from "@models/nature_pack/BirchTree_Snow_5";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

const Page = () => {
  const positions = generateTreePositions(100, 100, 1.5, 3);
  return (
    <div className="h-screen w-screen">
      <KeyboardControlsProvider>
        <Canvas>
          <Physics>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            <MinecraftCreativeControlsPlayer speed={25} />
            {/* <InstancedTreeSystem /> */}
            <gridHelper args={[100, 100]} />
            <InstancedBirchTreeSnow5 positions={positions} />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
