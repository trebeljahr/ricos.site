import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type ShaderMaterial, type Texture, Vector2, Vector3, Vector4 } from "three";
import { useEditorContext } from "./EditorContextProvider";

import { SceneWithLoadingState } from "@components/dom/ThreeFiberLayout";
import shadertoyDefinitions from "./shaders/shadertoyDefinitions.glsl";
import vertexShader from "./shaders/vertexShader.glsl";

export function FullCanvasShader() {
  return (
    <SceneWithLoadingState
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
    </SceneWithLoadingState>
  );
}

export function FullCanvasShaderMesh() {
  const { code, textures } = useEditorContext();
  const isShaderToy = useMemo(() => code.includes("void mainImage"), [code]);

  const fragmentShader = useMemo(
    () => (isShaderToy ? shadertoyDefinitions + "\n" + code : code),
    [code, isShaderToy],
  );

  const shaderRef = useRef<ShaderMaterial>(null!);
  const frameCount = useRef(0);
  const timeRef = useRef(0);

  const textureUniforms = useMemo(
    () =>
      textures.reduce(
        (acc, texture, index) => {
          acc[`u_tex${index}`] = { value: texture };
          acc[`iChannel${index}`] = { value: texture };
          return acc;
        },
        {} as { [key: string]: { value: Texture } },
      ),
    [textures],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: verify dependency list manually
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new Vector2(1, 1) },
      u_pixelRatio: {
        value: typeof window !== "undefined" ? window.devicePixelRatio : 1,
      },
      u_mouse: { value: new Vector2(0, 0) },
      iResolution: { value: new Vector3(1, 1, 1) },
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fragmentShader],
  );

  useFrame(({ size, pointer }, delta) => {
    if (!shaderRef.current) return;

    timeRef.current += delta;
    frameCount.current++;

    const mat = shaderRef.current;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

    if (isShaderToy) {
      mat.uniforms.iResolution.value.set(size.width, size.height, dpr);
      mat.uniforms.iTime.value = timeRef.current;
      mat.uniforms.iTimeDelta.value = delta;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const secondsSinceMidnight = now.getSeconds() + 60 * (now.getMinutes() + 60 * now.getHours());
      mat.uniforms.iDate.value.set(year, month, day, secondsSinceMidnight);
      mat.uniforms.iFrame.value = frameCount.current;
      mat.uniforms.iMouse.value.set(pointer.x, pointer.y, 0, 0);
    } else {
      mat.uniforms.u_time.value = timeRef.current;
      mat.uniforms.u_mouse.value.copy(pointer);
      mat.uniforms.u_resolution.value.set(size.width, size.height);
      mat.uniforms.u_pixelRatio.value = dpr;
    }

    // Sync texture uniforms
    for (const key in textureUniforms) {
      if (mat.uniforms[key]) {
        mat.uniforms[key].value = textureUniforms[key].value;
      }
    }
  });

  return (
    <mesh key={fragmentShader}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
