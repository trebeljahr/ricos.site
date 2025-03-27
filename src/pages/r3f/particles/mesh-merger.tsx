import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

import { Box, OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";

const seoInfo = {
  title: "Particles for Merging Meshes",
  description: "",
  url: "/r3f/particles/mesh-merger",
  keywords: [
    "threejs",
    "react-three-fiber",
    "particles",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/mesh-merger.png",
  imageAlt: "",
};

const Scene = () => {
  return (
    <>
      <Box args={[1, 1, 1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="orange" />
      </Box>
    </>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout
      {...seoInfo}
      withKeyboardControls={false}
      camera={{ position: new Vector3(0, 0, 2), near: 1, far: 3000 }}
    >
      <ambientLight />
      <Scene></Scene>
      <OrbitControls />
    </ThreeFiberLayout>
  );
}
