import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls, Stage, useFBX } from "@react-three/drei";
import { useControls } from "leva";
import { useRef } from "react";
import { Mesh } from "three";

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
  return <primitive object={characterModel} ref={characterMeshRef} />;
};

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["skyblue"]} />
        <ambientLight intensity={2} />
        <Stage adjustCamera={true}>
          <FbxViewer />
        </Stage>
        <OrbitControls />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
