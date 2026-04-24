import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type IUniform, type ShaderMaterial, Vector2 } from "three";

type Props = {
  otherUniforms?: { [uniform: string]: IUniform<any> };
  fragmentShader: string;
};

export function FullCanvasShader({ otherUniforms = {}, fragmentShader }: Props) {
  const shaderRef = useRef<ShaderMaterial>(null!);
  const timeRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      ...otherUniforms,
      u_time: { value: 0 },
      u_resolution: { value: new Vector2(1, 1) },
      u_pixelRatio: {
        value: typeof window !== "undefined" ? window.devicePixelRatio : 1,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fragmentShader],
  );

  useFrame(({ size }, delta) => {
    const mat = shaderRef.current;
    if (!mat) return;

    timeRef.current += delta;
    mat.uniforms.u_time.value = timeRef.current;
    mat.uniforms.u_resolution.value.set(size.width, size.height);

    // Sync otherUniforms values every frame (from Leva controls)
    for (const key in otherUniforms) {
      if (mat.uniforms[key]) {
        mat.uniforms[key].value = otherUniforms[key].value;
      }
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
