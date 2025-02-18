import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useRef, useState } from "react";
import { ShaderMaterial, Texture, Vector2 } from "three";
import initialShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";
import ReactCodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { cppLanguage } from "@codemirror/lang-cpp";

export function FullCanvasShaderEditor({ textures }: { textures: Texture[] }) {
  const [value, setValue] = useState(initialShader);
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);

  return (
    <div className="grid grid-cols-2 h-full">
      <ReactCodeMirror
        value={value}
        onChange={onChange}
        height="100%"
        theme={vscodeDark}
        extensions={[cppLanguage]}
      />

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
        {/* We use a random key to force re-mounting on changes */}
        <FullCanvasShaderMesh
          key={Math.random()}
          textures={textures}
          fragmentShader={value}
        />
      </Canvas>
    </div>
  );
}

type FullCanvasShaderMeshProps = {
  textures: Texture[];
  fragmentShader: string;
};

export function FullCanvasShaderMesh({
  textures,
  fragmentShader,
}: FullCanvasShaderMeshProps) {
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
