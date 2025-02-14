import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Rnd } from "react-rnd";
import { ShaderMaterial, Texture, Vector2 } from "three";
import initialShader from "../fragmentShader.glsl";
import vertexShader from "../vertexShader.glsl";
import { CodeEditor } from "./CodeEditor";
import {
  EditorContextProvider,
  useEditorContext,
} from "./EditorContextProvider";
import { TextureUploadUI } from "./TextureUploadUI";

const style = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "solid 1px #ddd",
  background: "#f0f0f0",
} as const;

export function CompleteShaderEditor() {
  return (
    <EditorContextProvider initialCode={initialShader}>
      <div className="grid grid-cols-2 h-screen">
        <CodeEditor />
        <Rnd
          style={style}
          default={{
            x: 0,
            y: 0,
            width: 200,
            height: 200,
          }}
        >
          <FullCanvasShaderDisplay />
        </Rnd>

        <TextureUploadUI />
      </div>
    </EditorContextProvider>
  );
}

export function FullCanvasShaderDisplay() {
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
    >
      <FullCanvasShaderMesh />
    </Canvas>
  );
}
export function FullCanvasShaderMesh() {
  const { code: fragmentShader, textures } = useEditorContext();

  const shaderRef = useRef<ShaderMaterial>(null!);
  const { size, pointer } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
      shaderRef.current.uniforms.u_pointer.value.copy(pointer);
    }
  });

  const textureUniforms = useMemo(
    () =>
      textures.reduce((acc, texture, index) => {
        acc[`u_tex${index}`] = { value: texture };
        return acc;
      }, {} as { [key: string]: { value: Texture } }),
    [textures]
  );

  return (
    <mesh key={Math.random()}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          u_time: { value: 0 },
          u_resolution: { value: new Vector2(size.width, size.height) },
          u_pixelRatio: { value: window.devicePixelRatio },
          u_pointer: { value: new Vector2(0, 0) },
          ...textureUniforms,
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
