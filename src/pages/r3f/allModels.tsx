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
import { Html, Plane } from "@react-three/drei";
import { DoubleSide } from "three";

const Page = () => {
  const groundColor = "#84fb34";
  return (
    <div className="w-screen h-screen bg-white">
      <KeyboardControlsProvider>
        <Leva />
        <Canvas>
          <Physics debug={physicsDebug}>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <hemisphereLight
              color={"#FFFFFF"}
              position={[0, 50, 0]}
              groundColor={groundColor}
            />
            <Plane
              args={[100, 100]}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[40, 0, 0]}
            >
              <meshStandardMaterial color={groundColor} side={DoubleSide} />
            </Plane>
            {/* // const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 2
            // ); hemiLight.color.setHSL( 0.6, 1, 0.6 );
            // hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
            // hemiLight.position.set( 0, 50, 0 ); */}
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            {Object.entries(assets).map(([key, Asset], index) => {
              console.log(key);

              return (
                <group key={index} position={[index * 3, 0, -10]}>
                  <Html
                    center
                    position={[0, 0.5, -2]}
                    scale={[-1, 1, 1]}
                    transform
                    occlude="blending"
                    className="text-black bg-white p-2"
                  >
                    {key}
                  </Html>
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
                    position={[0, 0.5, -2]}
                    scale={[-1, 1, 1]}
                    transform
                    occlude="blending"
                    className="text-black bg-white p-2"
                  >
                    {key}
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
