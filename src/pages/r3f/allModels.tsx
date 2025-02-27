import { physicsDebug } from "@components/canvas/ChunkGenerationSystem/config";
import { RigidBallSpawner } from "@components/canvas/ChunkGenerationSystem/RigidBall";
import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva } from "leva";
import * as assets from "@models/simple_nature_pack";
import * as moreAssets from "@models/nature_pack";
import { Html } from "@react-three/drei";

const Page = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KeyboardControlsProvider>
        <Leva />
        <Canvas>
          <Physics debug={physicsDebug}>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            {Object.entries(assets).map(([key, Asset], index) => {
              console.log(key);

              return (
                <group key={index} position={[index * 3, 0, -10]}>
                  <Asset />
                </group>
              );
            })}
            {Object.entries(moreAssets).map(([key, Asset], index) => {
              console.log(key);

              return (
                <group
                  key={index}
                  position={[(index - (index % 10)) / 2, 0, (index % 10) * 4]}
                >
                  <Html
                    center
                    position={[0, -0.5, 0]}
                    scale={[-1, 1, 1]}
                    transform
                  >
                    <div style={{ color: "black" }}>{key}</div>
                  </Html>
                  <Asset />
                </group>
              );
            })}
            <MinecraftCreativeControlsPlayer speed={25} />
            <RigidBallSpawner />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
