import { Fishs } from "@r3f/Scenes/FBOExperiments/Fish";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Box } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Vector3 } from "three";
import { perf } from "src/canvas/ChunkGenerationSystem/config";

export default function Page() {
  return (
    <ThreeFiberLayout>
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
