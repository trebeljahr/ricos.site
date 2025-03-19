import { useGLTF } from "@react-three/drei";
import { GLTFResult } from "src/@types";
import { Group, Mesh } from "three";

export const useAxe1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Axe-transformed.glb"
  ) as GLTFResult;

  const axeMesh = new Mesh(nodes.Skeleton_Axe.geometry, materials.skeleton);

  return axeMesh;
};
