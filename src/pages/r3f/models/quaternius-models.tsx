import {
  debug,
  physicsDebug,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { RigidBallSpawner } from "src/canvas/Helpers/RigidBall";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import * as animals from "@r3f/AllModels/animals_pack";
import * as dinosaurs from "@r3f/AllModels/dinosaurs_pack";
import * as natureAssets from "@r3f/AllModels/nature_pack";
import * as simpleNatureAssets from "@r3f/AllModels/simple_nature_pack";
import { Canvas, GroupProps, Props, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva } from "leva";

import { Plane, Text } from "@react-three/drei";
import { ComponentType, PropsWithChildren, useRef } from "react";
import { DoubleSide } from "three";
import { In, ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

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

export const AssetWithText = ({
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

export const GridOfModels = ({
  assets,
  indexOffset = 0,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  assets: Record<string, ComponentType<GroupProps>>;
  indexOffset?: number;
  rotation?: [number, number, number];
  scale?: number;
}) => {
  return (
    <>
      {Object.entries(assets).map(([key, Asset], index) => {
        const combinedIndex = index + indexOffset;

        return (
          <AssetWithText key={key} index={combinedIndex} text={key}>
            <group rotation={rotation}>
              <Asset scale={scale} />
            </group>
          </AssetWithText>
        );
      })}
    </>
  );
};

const seoInfo = {
  title: "Quaternius Models Showcase",
  description:
    "A showcase of Quaternius models in a simple grid to help me choose which one to use.",
  url: "/r3f/models/quaternius-models",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/quaternius-models.png",
  imageAlt: "Image of a grid filled with 3D models",
};

const Page = () => {
  const groundColor = "#84fb34";

  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      camera={{ position: [0, 5, tileSize / 2] }}
    >
      <In>
        <Leva />
      </In>
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
          <axesHelper args={[1]} />
          <GridOfModels assets={allNatureAssets} />
          <GridOfModels
            assets={animalAssets}
            indexOffset={natureKeysLength}
            rotation={[0, -Math.PI, 0]}
            scale={0.2}
          />
        </group>

        <MinecraftSpectatorController speed={1} />
      </Physics>
    </ThreeFiberLayout>
  );
};

export default Page;
