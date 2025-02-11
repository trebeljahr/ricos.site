import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { IUniform, ShaderMaterial, Vector2 } from "three";

type Props = {
  otherUniforms?: { [uniform: string]: IUniform<any> };
  fragmentShader: string;
};

export function FullCanvasShader({
  otherUniforms = {},
  fragmentShader,
}: Props) {
  const shaderRef = useRef<ShaderMaterial>(null!);
  const { size } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          ...otherUniforms,
          uTime: { value: 0 },
          uResolution: { value: new Vector2(size.width, size.height) },
        }}
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
