// Import the useThree hook from the library
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { ShaderMaterial, Vector2 } from "three";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";

function FullCanvasShaderMesh() {
  const shaderRef = useRef<ShaderMaterial>(null!);
  // Get the size of the canvas to pass to the shader as the resolution
  const { size } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          u_time: { value: 0 },
          // Add the new uniform for the resolution
          u_resolution: { value: new Vector2(size.width, size.height) },
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
