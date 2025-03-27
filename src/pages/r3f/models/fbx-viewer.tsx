import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Box, OrbitControls, Stage, useFBX } from "@react-three/drei";
import { useControls } from "leva";
import { useRef, Suspense } from "react";
import { Mesh } from "three";
import dynamic from "next/dynamic";

// Dynamically import components
const FbxViewer = () => {
  const { characterName } = useControls({
    characterName: {
      value: "x-bot",
      label: "Character Name",
      options: ["michelle", "x-bot", "y-bot"],
    },
  });

  const characterMeshRef = useRef<Mesh>(null!);
  const characterModel = useFBX(`/3d-assets/fbx/${characterName}.fbx`);

  return (
    <primitive
      object={characterModel}
      ref={characterMeshRef}
      position={[0, 0, 0]}
    />
  );
};

const seoInfo = {
  title: "A Viewer for some FBX Models",
  description:
    "In this project I tried to figure out how to load FBX models in R3F. I eventually switched to GLB models, but this is still a good reference.",
  url: "/r3f/models/fbx-viewer",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/fbx-viewer.png",
  imageAlt: "a 3D model view of the default x-bot character from Mixamo",
};

export default function Page() {
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      camera={{ position: [1, 1.5, 3] }}
      withKeyboardControls={false}
    >
      <color attach="background" args={["#f7f9f9"]} />
      <ambientLight intensity={0.5} />
      <ambientLight />

      <directionalLight position={[10, 10, 5]} intensity={1} />

      <Stage adjustCamera={false} intensity={0} shadows={true}>
        <group scale={0.01}>
          <FbxViewer />
        </group>
      </Stage>
      <OrbitControls />
    </ThreeFiberLayout>
  );
}
