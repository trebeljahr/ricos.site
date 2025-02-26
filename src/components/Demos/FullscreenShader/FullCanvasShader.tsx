import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ShaderMaterial, Texture, Vector2, Vector3, Vector4 } from "three";
import { useEditorContext } from "./EditorContextProvider";

import vertexShader from "./shaders/vertexShader.glsl";
import shadertoyDefinitions from "./shaders/shadertoyDefinitions.glsl";

export function FullCanvasShader() {
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
  const { code, textures } = useEditorContext();
  const isShaderToy = useMemo(() => code.includes("void mainImage"), [code]);

  const fragmentShader = useMemo(
    () => (isShaderToy ? shadertoyDefinitions + "\n" + code : code),
    [code, isShaderToy]
  );

  const shaderRef = useRef<ShaderMaterial>(null!);
  const { size } = useThree();

  useFrame(({ clock, pointer }, frameCount) => {
    if (!shaderRef.current) return;
    if (isShaderToy) {
      shaderRef.current.uniforms.iResolution.value.set(
        size.width,
        size.height,
        window.devicePixelRatio
      );
      shaderRef.current.uniforms.iTime.value = clock.getElapsedTime();
      shaderRef.current.uniforms.iTimeDelta.value = clock.getDelta();
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() is zero-based
      const day = now.getDate();
      const secondsSinceMidnight =
        now.getSeconds() + 60 * (now.getMinutes() + 60 * now.getHours());
      shaderRef.current.uniforms.iDate.value.set(
        year,
        month,
        day,
        secondsSinceMidnight
      );
      shaderRef.current.uniforms.iFrame.value = frameCount;
      shaderRef.current.uniforms.iMouse.value.set(pointer.x, pointer.y, 0, 0);
    } else {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
      shaderRef.current.uniforms.u_mouse.value.copy(pointer);
      shaderRef.current.uniforms.u_resolution.value.set(
        size.width,
        size.height
      );
      shaderRef.current.uniforms.u_pixelRatio.value = window.devicePixelRatio;
    }
  });

  const textureUniforms = useMemo(
    () =>
      textures.reduce((acc, texture, index) => {
        acc[`u_tex${index}`] = { value: texture };
        acc[`iChannel${index}`] = { value: texture };

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
          u_mouse: { value: new Vector2(0, 0) },
          iResolution: {
            value: new Vector3(
              size.width,
              size.height,
              window.devicePixelRatio
            ),
          },
          iTime: { value: 0 },
          iTimeDelta: { value: 0 },
          iDate: { value: new Vector4() },
          iFrame: { value: 0 },
          iMouse: { value: new Vector4(0, 0, 0, 0) },
          iChannelTime: { value: [0, 0, 0, 0] },
          iSampleRate: { value: 44100 },
          iChannelResolution: {
            value: [new Vector3(), new Vector3(), new Vector3(), new Vector3()],
          },
          ...textureUniforms,
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
