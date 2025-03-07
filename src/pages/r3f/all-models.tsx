import {
  debug,
  physicsDebug,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { RigidBallSpawner } from "src/canvas/Helpers/RigidBall";
import { MinecraftCreativeController } from "src/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import * as animals from "src/canvas/models/animals_pack";
import * as dinosaurs from "src/canvas/models/dinosaurs_pack";
import * as natureAssets from "src/canvas/models/nature_pack";
import * as simpleNatureAssets from "src/canvas/models/simple_nature_pack";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva } from "leva";

import { Plane, Text } from "@react-three/drei";
import { PropsWithChildren, useRef } from "react";
import { DoubleSide } from "three";
import { ThreeFiberLayout } from "@components/dom/Layout";

const allNatureAssets = {
  ...simpleNatureAssets,
  ...natureAssets,
};

const animalAssets = {
  ...animals,
  ...dinosaurs,
};

const natureKeysLength = Object.keys(allNatureAssets).length;

const length = [...Object.keys(allNatureAssets), ...Object.keys(animalAssets)]
  .length;

const amountPerColumn = 10;
const rowSize = tileSize / amountPerColumn;
const columnSize = tileSize / (length / amountPerColumn);

const AssetWithText = ({
  index,
  text,
  children,
}: PropsWithChildren<{ index: number; text: string }>) => {
  const x = (index - (index % 10)) / 10;
  const z = index % 10;

  const textRef = useRef<any>(null!);

  useFrame(({ camera }) => {
    textRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group
      key={index}
      position={[(x + 0.5) * columnSize, 0, (z + 0.5) * rowSize]}
    >
      <Text
        ref={textRef}
        position={[0, 0.3, 1.5]}
        // scale={[-1, 1, 1]}
        fontSize={0.4}
        color={"#000000"}
      >
        {text} {debug && `${x},${z}`}
      </Text>
      <group rotation={[0, -Math.PI, 0]}>{children}</group>
    </group>
  );
};

const Page = () => {
  const groundColor = "#84fb34";

  return (
    <ThreeFiberLayout>
      <KeyboardControlsProvider>
        <Leva />
        <Canvas camera={{ position: [0, 5, tileSize / 2] }}>
          <Physics debug={physicsDebug}>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <hemisphereLight
              color={"#FFFFFF"}
              position={[0, 50, 0]}
              groundColor={groundColor}
            />

            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />

            <Plane args={[tileSize, 100]} rotation={[-Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color={groundColor} side={DoubleSide} />
            </Plane>
            <gridHelper args={[tileSize, 100]} position={[0, 0.001, 0]} />

            <group position={[-tileSize / 2, 0.1, -tileSize / 2]}>
              <axesHelper args={[5]} />

              {Object.entries(allNatureAssets).map(([key, Asset], index) => {
                return (
                  <AssetWithText key={key} index={index} text={key}>
                    <Asset />
                  </AssetWithText>
                );
              })}

              {Object.entries(animalAssets).map(([key, Asset], index) => {
                const combinedIndex = index + natureKeysLength;

                return (
                  <AssetWithText key={key} index={combinedIndex} text={key}>
                    <group rotation={[0, -Math.PI, 0]}>
                      <Asset scale={0.2} />
                    </group>
                  </AssetWithText>
                );
              })}
            </group>

            <MinecraftCreativeController speed={25} />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
