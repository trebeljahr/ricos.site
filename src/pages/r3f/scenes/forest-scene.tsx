import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { MixamoCharacterNames } from "@r3f/Characters/Character";
import { SnowyPineTreesForChunks } from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { EcctrlControllerCustom } from "@r3f/Controllers/CustomEcctrlController/Controller";
import { MixamoEcctrlControllerWithAnimations } from "@r3f/Controllers/CustomEcctrlController/ControllerWithAnimations";
import { MovingSkyLight } from "@r3f/Helpers/OverheadLights";
import { FloorWithPhysics } from "@r3f/Helpers/PhysicsFloor";
import {
  AllRoGrass,
  CircleGrassPlane,
} from "@r3f/Scenes/Grass/AllRoGrass/GrassPlane";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { TreeWithHullPhysics } from "@r3f/Trees/TreesWithPhysics";
import { Box, Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense } from "react";
import {
  physicsDebug,
  tilesDistance,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  const { camera } = useThree();
  return (
    <group>
      {Array.from(chunks).map(([key, chunkData], index) => {
        if (!chunkData.data) return null;
        return (
          <Suspense key={index}>
            <MemoizedChunk chunkData={chunkData}>
              <HeightfieldTileWithCollider
                geometry={chunkData.data!.geo}
                heightfield={chunkData.data!.heightfield}
              />
            </MemoizedChunk>
          </Suspense>
        );
      })}
    </group>
  );
};

const seoInfo = {
  title: "Endless Snow Forest",
  description:
    "An endless snow forest scene in React Three Fiber, implemented using a chunk generation system, web workers and the instancedMesh2 library.",
  url: "/r3f/scenes/snow-forest",
  keywords: [
    "threejs",
    "react-three-fiber",
    "instancedMesh2",
    "instancing",
    "chunk generation",
    "terrain",
    "procedural generation",
    "procedural terrain",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/snow-forest.png",
  imageAlt: "a snow covered forest scene extending towards the horizon",
};

const Page = () => {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <ambientLight intensity={1} />

      <Sky />
      <directionalLight
        intensity={10}
        position={[0, 10, 0]}
        color={"#808080"}
        target-position={[0, 0, 0]}
        castShadow={true}
      />
      <Physics debug={physicsDebug}>
        <RigidBody position={[0, -1, 0]} colliders={"cuboid"} type={"fixed"}>
          <Box
            args={[100, 2, 100]}
            position={[0, -0.1, 0]}
            receiveShadow={true}
          >
            <meshStandardMaterial
              color={"#959393"}
              roughness={0.9}
              metalness={0.1}
            />
          </Box>
        </RigidBody>

        {/* <group scale={0.2}>
          <AllRoGrass />
        </group>
        <group scale={0.2} position={[6.4, 0, 0]}>
          <AllRoGrass />
        </group> */}

        <group scale={0.2} position={[6.4, 0, 0]}>
          <CircleGrassPlane />
        </group>

        <group position={[0, 1, 0]}>
          <TreeWithHullPhysics />
        </group>

        <MixamoEcctrlControllerWithAnimations
          position={[0, 50, 10]}
          characterName={MixamoCharacterNames.XBot}
          characterSpecificYOffset={-0.82}
          characterSpecificScale={0.8}
        />
      </Physics>
    </ThreeFiberLayout>
  );
};

export default Page;
