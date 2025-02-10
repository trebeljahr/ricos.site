import Grass from "@components/canvas/Grass";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls, Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Vector3 } from "three";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Canvas camera={{ position: new Vector3(915, 15, 10) }}>
        <Sky azimuth={1} inclination={0.6} distance={1000} />
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <Grass />
        </Suspense>
        <OrbitControls
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 2.5}
        />
      </Canvas>
    </ThreeFiberLayout>
  );
}
