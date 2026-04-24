import { useGLTF } from "@react-three/drei";
import type { GLTFResult } from "src/@types";
import { Mesh } from "three";

export const useBow1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Crossbow-transformed.glb",
  ) as unknown as unknown as GLTFResult;

  const crossbowMesh = new Mesh(nodes.Skeleton_Crossbow.geometry, materials.skeleton);

  crossbowMesh.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

  return crossbowMesh;
};
