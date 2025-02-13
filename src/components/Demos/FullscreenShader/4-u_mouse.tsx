import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { ShaderMaterial, Vector2 } from "three";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";

function FullCanvasShaderMesh() {
  const shaderRef = useRef<ShaderMaterial>(null!);
  // get the pointer from the useThree hook
  const { size, pointer } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
      // Update the mouse uniform; pointer is a Vector2 with normalized coordinates, from -1 to 1
      shaderRef.current.uniforms.u_mouse.value.copy(pointer);
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          u_time: { value: 0 },
          u_resolution: { value: new Vector2(size.width, size.height) },
          // Add a new uniform for mouse position
          u_mouse: { value: new Vector2(0, 0) },
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
