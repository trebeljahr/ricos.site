import { ThreeFiberLayout } from "@components/dom/Layout";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import vertexShader from "@shaders/simplestShader.vert";
import fragmentShader from "@shaders/simplestShader.frag";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas>
        <mesh>
          <planeGeometry args={[20, 20]} />
          {/* <shaderMaterial
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
          /> */}
          <meshBasicMaterial color="red" />
        </mesh>
        <OrthographicCamera makeDefault args={[-1, 1, 1, -1, 0, 1]} />
      </Canvas>
    </ThreeFiberLayout>
  );
}
