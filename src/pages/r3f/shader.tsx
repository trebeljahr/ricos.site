import { FullCanvasShader } from "@components/canvas/FullCanvasShader";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Canvas } from "@react-three/fiber";
import abcShader from "@shaders/standaloneFragmentShaders/abc.frag";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas
        orthographic
        camera={{
          left: -1,
          right: 1,
          top: 1,
          bottom: -1,
          near: 0.1,
          far: 1000,
          position: [0, 0, 1],
        }}
      >
        <FullCanvasShader fragmentShader={abcShader} />
      </Canvas>
    </ThreeFiberLayout>
  );
}
