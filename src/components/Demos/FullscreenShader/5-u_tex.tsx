import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
// adding the Texture import
import { ShaderMaterial, Texture, Vector2 } from "three"; // [!code ++]
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";

export function FullCanvasShader({ textures }: { textures: Texture[] }) {
  return (
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
      className="w-full h-full"
    >
      {/* We use a random key to force re-mounting on changes */}
      <FullCanvasShaderMesh key={Math.random()} textures={textures} />
    </Canvas>
  );
}

// --- FullCanvasShaderMesh Component ---
export function FullCanvasShaderMesh({ textures }: { textures: Texture[] }) {
  const shaderRef = useRef<ShaderMaterial>(null!);
  const { size, pointer } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
      shaderRef.current.uniforms.u_mouse.value.copy(pointer);
    }
  });

  // Build texture uniforms (u_tex0, u_tex1, etc.)
  const textureUniforms = textures.reduce((acc, texture, index) => {
    acc[`u_tex${index}`] = { value: texture };
    return acc;
  }, {} as { [key: string]: { value: Texture } });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          u_time: { value: 0 },
          u_resolution: { value: new Vector2(size.width, size.height) },
          u_pixelRatio: { value: window.devicePixelRatio },
          u_mouse: { value: new Vector2(0, 0) },
          ...textureUniforms,
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
