import { Fishs } from "@r3f/Scenes/FBOExperiments/Fish";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Box } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Vector3 } from "three";
import { perf } from "src/canvas/ChunkGenerationSystem/config";

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
      <CanvasWithKeyboardInput
        camera={{ position: new Vector3(0, 0, 50), near: 1, far: 3000 }}
      >
        <Fishs />
        <Box args={[1, 1, 1]}>
          <meshPhysicalMaterial color="pink" />
        </Box>
        <ambientLight />
        <fog color={0xffffff} near={100} far={1000} />
        {perf && <Perf position="bottom-right" />}
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
