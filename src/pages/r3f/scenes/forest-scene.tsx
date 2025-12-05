import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { MixamoCharacterNames } from "@r3f/Characters/Character";
import {
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { MixamoEcctrlControllerWithAnimations } from "@r3f/Controllers/CustomEcctrlController/ControllerWithAnimations";
import {
  CircleGrassPlane,
  PlayerWithGrassTrail,
} from "@r3f/Scenes/Grass/AllRoGrass/GrassPlane";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { TreeWithHullPhysics } from "@r3f/Trees/TreesWithPhysics";
import { Box, Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense } from "react";
import { physicsDebug } from "src/canvas/ChunkGenerationSystem/config";

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
  title: "",
  description: "",
  url: "/r3f/scenes/snow-forest",
  keywords: [],
  image: "/assets/pages/snow-forest.png",
  imageAlt: "",
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

        <PlayerWithGrassTrail />

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
