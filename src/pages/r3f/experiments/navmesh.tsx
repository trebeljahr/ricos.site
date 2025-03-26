import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { DebugDrawer, threeToSoloNavMesh } from "@recast-navigation/three";
import { useEffect } from "react";
import { init } from "recast-navigation";
import { Mesh } from "three";

const NavmeshExample = () => {
  const { scene } = useThree();
  const navmeshThing = useGLTF("/3d-assets/glb/nav_test.glb");

  useEffect(() => {
    async function initNavmeshes() {
      await init();

      const meshes: Mesh[] = [];
      scene.traverse((child) => {
        if (child instanceof Mesh) {
          meshes.push(child);
        }
      });

      const cs = 0.05;
      const ch = 0.05;
      const walkableRadius = 0.2;

      const { success, navMesh } = threeToSoloNavMesh(meshes, {
        cs,
        ch,
        walkableRadius: Math.round(walkableRadius / ch),
      });

      console.log(navMesh, success);

      if (!navMesh) return;

      const debugDrawer = new DebugDrawer();

      scene.add(debugDrawer);

      debugDrawer.drawNavMesh(navMesh);

      // clear the debug drawer

      //   debugDrawer.reset();
      // debugDrawer.dispose();
    }
    initNavmeshes();
  }, [scene]);

  return (
    <Stage adjustCamera={true}>
      <primitive object={navmeshThing.scene} />
      <OrbitControls />
    </Stage>
  );
};

const seoInfo = {
  title: "Navmesh Demo",
  description:
    "A demo of a Recast navmesh in a 3D scene, powered by the awesome recast-js library.",
  url: "/r3f/experiments/navmesh",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/navmesh.png",
  imageAlt: "a simple navmesh with debug triangles shown in a 3D scene",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState>
        <color attach="background" args={["#dfd3ae"]} />

        <NavmeshExample />
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}
