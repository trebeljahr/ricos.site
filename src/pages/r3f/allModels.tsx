import { physicsDebug } from "@components/canvas/ChunkGenerationSystem/config";
import { RigidBallSpawner } from "@components/canvas/ChunkGenerationSystem/RigidBall";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import * as animals from "@models/animals_pack";
import * as dinosaurs from "@models/dinosaurs_pack";
import * as natureAssets from "@models/nature_pack";
import * as simpleNatureAssets from "@models/simple_nature_pack";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva } from "leva";

import { Plane, Text } from "@react-three/drei";
import { PropsWithChildren } from "react";
import { DoubleSide } from "three";

const AssetWithText = ({
  index,
  text,
  children,
}: PropsWithChildren<{ index: number; text: string }>) => {
  return (
    <group
      key={index}
      position={[(index - (index % 10)) / 2, 0, (index % 10) * 4]}
    >
      <Text
        position={[0, 0.3, -1.5]}
        scale={[-1, 1, 1]}
        fontSize={0.4}
        color={"#000000"}
      >
        {text}
      </Text>
      {children}
    </group>
  );
};

const allAssets = {
  ...simpleNatureAssets,
  ...natureAssets,
  ...animals,
  ...dinosaurs,
};

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

            {Object.entries(allAssets).map(([key, Asset], index) => {
              return (
                <AssetWithText key={key} index={index} text={key}>
                  <Asset />
                </AssetWithText>
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
