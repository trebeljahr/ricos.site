// importing the useFrame hook from the @react-three/fiber package
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { ShaderMaterial } from "three";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";

function FullCanvasShaderMesh() {
  const shaderRef = useRef<ShaderMaterial>(null!);

  // using the useFrame hook to update the uniform every frame
  useFrame(({ clock }) => {
    if (shaderRef.current) {
      // and updating the uniform value in the shader with the elapsed time
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          // adding time as a uniform value, a simple float
          u_time: { value: 0 },
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
