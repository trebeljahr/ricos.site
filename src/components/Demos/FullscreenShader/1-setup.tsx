import { Canvas } from "@react-three/fiber";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";

function FullCanvasShaderMesh() {
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

export function FullCanvasShader() {
  return (
    <Canvas
      orthographic={true}
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
      <FullCanvasShaderMesh />
    </Canvas>
  );
}
