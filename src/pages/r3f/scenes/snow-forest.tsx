import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { SnowyPineTreesForChunks } from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { MovingSkyLight } from "@r3f/Helpers/OverheadLights";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { physicsDebug, tileSize, tilesDistance } from "src/canvas/ChunkGenerationSystem/config";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  const { camera } = useThree();
  return (
    <group>
      {Array.from(chunks).map(([_key, chunkData], index) => {
        if (!chunkData.data) return null;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
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

const defaultSeoInfo = {
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

const Page = ({ seo }: { seo: SeoInfo | null }) => {
  const seoInfo = {
    ...defaultSeoInfo,
    ...(seo && {
      title: seo.metaTitle,
      description: seo.metaDescription,
      image: seo.ogImage,
      imageAlt: seo.ogImageAlt,
      keywords: seo.keywords,
    }),
  };
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      camera={{
        near: 0.1,
        far: tileSize * (tilesDistance + 2),
        position: [-35, 30, -60],
      }}
    >
      <MovingSkyLight />
      <ambientLight intensity={1} />

      <Physics debug={physicsDebug}>
        <ChunkProvider>
          <ChunkRenderer />
          <SnowyPineTreesForChunks />
        </ChunkProvider>

        <MinecraftSpectatorController speed={1} />
      </Physics>
    </ThreeFiberLayout>
  );
};

export default Page;

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/scenes/snow-forest") } };
}
